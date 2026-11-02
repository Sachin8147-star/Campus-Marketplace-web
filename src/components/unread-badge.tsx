import { capCount } from '@/lib/inbox';

/** Small red dot with a number. Pass `floating` to pin it to the corner of an icon. */
export function UnreadBadge({ count, cap, floating = false, label = 'unread' }: { count: number; cap: number; floating?: boolean; label?: string }) {
  if (!count || count < 1) return null;
  return <span className={`unread-badge ${floating ? 'unread-badge-floating' : ''}`} aria-label={`${count} ${label}`}>{capCount(count, cap)}</span>;
}
