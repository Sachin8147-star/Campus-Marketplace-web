import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { App } from '@capacitor/app';
import { isNativeApp } from '@/lib/api-config';
import { useUser } from '@clerk/react';
import { toast } from '@/hooks/use-toast';
import { notificationsKey, unreadKey, useNotificationFeed } from '@/lib/inbox';
import { startPush } from '@/lib/native-push';

/**
 * - shows a small pop-up when something new arrives while the app is open
 * - registers the phone for push notifications (needs Firebase; harmless without it)
 */
export function NotificationWatcher() {
  const { user } = useUser();
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();
  const feed = useNotificationFeed();
  const lastSeenId = useRef<number | null>(null);

  useEffect(() => {
    const items = feed.data?.items;
    if (!items) return;
    const newest = items[0]?.id ?? 0;
    if (lastSeenId.current !== null && newest > lastSeenId.current) {
      const fresh = items.filter(i => i.id > (lastSeenId.current ?? 0) && i.isNew);
      if (fresh[0]) toast({ title: fresh[0].title, description: fresh.length > 1 ? `${fresh[0].body} (+${fresh.length - 1} more)` : fresh[0].body });
    }
    lastSeenId.current = newest;
  }, [feed.data]);

  // Refresh the red dots whenever the person moves to another page or comes back to the app.
  useEffect(() => {
    if (!user) return;
    void qc.invalidateQueries({ queryKey: unreadKey });
    void qc.invalidateQueries({ queryKey: notificationsKey });
  }, [location, user?.id, qc]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: unreadKey });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    let sub: { remove: () => Promise<void> } | undefined;
    if (isNativeApp()) void App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }).then(h => { sub = h; });
    return () => { document.removeEventListener('visibilitychange', onVisible); void sub?.remove(); };
  }, [user?.id, qc]);

  useEffect(() => {
    if (!user) { lastSeenId.current = null; return; }
    let stop: (() => void) | undefined;
    void startPush(link => setLocation(link), () => {
      void qc.invalidateQueries({ queryKey: notificationsKey });
      void qc.invalidateQueries({ queryKey: unreadKey });
    }).then(off => { stop = off; });
    return () => stop?.();
  }, [user?.id, qc, setLocation]);

  return null;
}
