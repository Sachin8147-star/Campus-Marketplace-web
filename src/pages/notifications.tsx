import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle, Sparkles } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { AppPage } from '@/components/shell';
import { EmptyState, ErrorState } from '@/components/states';
import { notificationsKey, useNotificationFeed } from '@/lib/inbox';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const feed = useNotificationFeed();
  // Remember which items were new when the page opened so they stay highlighted while the badge clears.
  const [highlight, setHighlight] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!feed.data || highlight) return;
    setHighlight(new Set(feed.data.items.filter(i => i.isNew).map(i => i.id)));
    if (feed.data.unread > 0) {
      void customFetch('/api/notifications/seen', { method: 'POST' })
        .then(() => qc.invalidateQueries({ queryKey: notificationsKey }))
        .catch(() => undefined);
    }
  }, [feed.data, highlight, qc]);

  return (
    <AppPage>
      <div className="max-w-[680px] mx-auto">
        <div className="page-heading">
          <span className="eyebrow">WHAT’S NEW</span>
          <h1>Your <em>notifications.</em></h1>
          <p>New messages and new listings on campus.</p>
        </div>

        {feed.isLoading ? (
          <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#f7f4eb] rounded-2xl" />)}</div>
        ) : feed.isError ? (
          <ErrorState retry={() => void feed.refetch()} error={feed.error} />
        ) : feed.data && feed.data.items.length > 0 ? (
          <ul className="space-y-3">
            {feed.data.items.map(item => {
              const fresh = highlight?.has(item.id);
              const Icon = item.kind === 'message' ? MessageCircle : Sparkles;
              return (
                <li key={item.id}>
                  <button onClick={() => setLocation(item.link)} className={`w-full text-left flex gap-3.5 items-start rounded-2xl border p-4 transition-colors ${fresh ? 'bg-[#eef7f1] border-[#cfe5d6]' : 'bg-white border-[#e6e2d8]'} hover:bg-[#fbfaf5]`}>
                    <span className={`w-11 h-11 rounded-full grid place-items-center shrink-0 ${item.kind === 'message' ? 'bg-[#e6f4ea] text-[#2a7a46]' : 'bg-[#fdf0e3] text-[#b0661a]'}`}><Icon size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[16px] text-[#213b34] leading-snug">{item.title}</b>
                      <span className="block text-[15px] text-[#4f6158] mt-0.5 line-clamp-2">{item.body}</span>
                      <small className="block text-[13px] text-[#65766e] mt-1.5">{timeAgo(item.createdAt)}</small>
                    </span>
                    {fresh && <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-[#e5484d] shrink-0" aria-label="new" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="You’re all caught up." body="When someone messages you or lists something new, it shows up here." action={<span className="inline-flex text-[#285f51]"><Bell size={20} /></span>} />
        )}
      </div>
    </AppPage>
  );
}
