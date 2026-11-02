import type { ReactNode } from 'react';
import { ArrowRight, CircleHelp, Compass } from 'lucide-react';
import { ApiError, UnexpectedResponseError } from '@workspace/api-client-react';
import { getApiBaseUrl } from '@/lib/api-config';

export function describeError(error: unknown): { title: string; body: string } {
  const base = getApiBaseUrl();
  if (error instanceof ApiError) {
    if (error.status === 401) return { title: 'Please sign in again.', body: 'Your session has expired or could not be verified by the server.' };
    if (error.status === 404) return { title: 'We couldn’t find that.', body: 'It may have been removed by the seller.' };
    if (error.status >= 500) {
      return { title: 'The server hit a snag.', body: `It answered with HTTP ${error.status}${error.status === 502 ? ' (the marketplace service is not running)' : ''}. Give it a moment, then try again.` };
    }
    return { title: 'That didn’t work.', body: error.message };
  }
  if (error instanceof UnexpectedResponseError) {
    return { title: 'That isn’t the Campus backend.', body: 'The app reached a web page instead of the API. Please update the app, or tell us under Help → Report a problem.' };
  }
  return {
    title: 'We couldn’t reach the shelves.',
    body: base
      ? `The app couldn’t connect to ${base}. Check your internet connection, then try again.`
      : 'The app couldn’t connect to the backend. Check your internet connection, then try again.',
  };
}

export function ErrorState({ retry, error }: { retry: () => void; error?: unknown }) {
  const { title, body } = describeError(error);
  return (
    <div className="state-card error-state">
      <div className="state-icon"><CircleHelp /></div>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button className="button button-primary" onClick={retry} data-testid="button-retry"><ArrowRight size={16} /> Try again</button>
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="state-card"><div className="state-icon"><Compass /></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}
