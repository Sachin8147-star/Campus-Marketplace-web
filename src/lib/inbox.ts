import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { customFetch } from '@workspace/api-client-react';

export type InboxUnread = { people: number; messages: number; threads: Record<string, number> };
export type AppNotification = { id: number; kind: 'message' | 'listing'; title: string; body: string; link: string; createdAt: string; isNew: boolean };
export type NotificationFeed = { unread: number; items: AppNotification[] };

export const unreadKey = ['inbox-unread'] as const;
export const notificationsKey = ['notifications'] as const;

/** 5 -> "4+" when the cap is 4. */
export const capCount = (count: number, cap: number): string => (count > cap ? `${cap}+` : String(count));

/** People who have unread messages for me, and unread messages per conversation. Refreshes every 15 s. */
export function useInboxUnread() {
  const { user } = useUser();
  return useQuery({
    queryKey: unreadKey,
    enabled: Boolean(user),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: () => customFetch<InboxUnread>('/api/inbox/unread', { cache: 'no-store' }),
  });
}

export function useNotificationFeed() {
  const { user } = useUser();
  return useQuery({
    queryKey: notificationsKey,
    enabled: Boolean(user),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: () => customFetch<NotificationFeed>('/api/notifications', { cache: 'no-store' }),
  });
}
