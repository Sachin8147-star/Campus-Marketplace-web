import { ApiError, UnexpectedResponseError } from '@workspace/api-client-react';

/** Turns any failed request into one short sentence a student can act on. */
export function friendlyError(error: unknown, whatFailed: string): string {
  if (error instanceof ApiError) {
    const data = error.data as { error?: unknown } | null | undefined;
    const detail = data?.error;
    if (error.status === 400) {
      if (detail && typeof detail === 'object') {
        const first = Object.values(detail as Record<string, unknown>)[0];
        const text = Array.isArray(first) ? String(first[0]) : typeof first === 'string' ? first : '';
        if (/at least (\d+) characters/i.test(text)) return `${whatFailed}: please write at least ${text.match(/at least (\d+)/i)?.[1]} characters.`;
        if (text) return `${whatFailed}: ${text}`;
      }
      if (typeof detail === 'string' && detail) return `${whatFailed}: ${detail}`;
      return `${whatFailed}: some details look off. Please check and try again.`;
    }
    if (error.status === 401) return `${whatFailed}: your login could not be verified. Sign out, sign in again, then retry.`;
    if (error.status === 404) return `${whatFailed}: that item no longer exists.`;
    if (error.status === 502 || error.status === 503) return `${whatFailed}: the server is waking up. Wait a few seconds and try again.`;
    if (error.status >= 500) return `${whatFailed}: the server had a problem (HTTP ${error.status}). Help → Check connection shows what is wrong.`;
    return `${whatFailed} (HTTP ${error.status}).`;
  }
  if (error instanceof UnexpectedResponseError) return `${whatFailed}: the app is pointed at the wrong server. Open Help → Check connection.`;
  return `${whatFailed}: couldn’t reach the server. Check your internet and try again.`;
}
