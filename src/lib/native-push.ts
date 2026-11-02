import { PushNotifications } from '@capacitor/push-notifications';
import { customFetch } from '@workspace/api-client-react';
import { isNativeApp } from './api-config';

const TOKEN_KEY = 'campuscrate_push_token';

/** Asks permission and registers this phone for push messages. Does nothing if Firebase is not set up. */
/** Push is only switched on in builds that include Firebase (see scripts/build-apk.mjs). */
const PUSH_ENABLED = import.meta.env.VITE_ENABLE_PUSH === 'true';

export async function startPush(onOpenLink: (link: string) => void, onForeground: () => void): Promise<() => void> {
  if (!isNativeApp() || !PUSH_ENABLED) return () => undefined;
  const handles: { remove: () => Promise<void> }[] = [];
  try {
    handles.push(await PushNotifications.addListener('registration', ({ value }) => {
      try { localStorage.setItem(TOKEN_KEY, value); } catch { /* ignore */ }
      void customFetch('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: value }) }).catch(() => undefined);
    }));
    // Happens when google-services.json (Firebase) is not part of the build: the app simply works without push.
    handles.push(await PushNotifications.addListener('registrationError', () => undefined));
    handles.push(await PushNotifications.addListener('pushNotificationReceived', () => onForeground()));
    handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const link = (notification.data as { link?: string } | undefined)?.link;
      if (link) onOpenLink(link);
    }));
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') await PushNotifications.register();
  } catch {
    /* push is optional */
  }
  return () => handles.forEach(h => { void h.remove(); });
}

/** Called on sign-out so the next person on this phone does not receive your notifications. */
export async function forgetPushToken(): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    localStorage.removeItem(TOKEN_KEY);
    await customFetch('/api/push/register', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  } catch { /* best effort */ }
}
