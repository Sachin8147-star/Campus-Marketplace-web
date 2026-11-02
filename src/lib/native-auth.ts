import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { getApiBaseUrl } from './api-config';

export const APP_SCHEME = 'com.campus.marketplace';

/** Opens direct Google OAuth (bypassing Clerk completely for Google). */
export async function openBrowserSignIn(): Promise<void> {
  const base = getApiBaseUrl();
  await Browser.open({ url: `${base}/api/auth/google?native=1&s=${Date.now()}` });
}

export async function listenForSignInTicket(onTicket: (ticket: string) => void | Promise<void>): Promise<() => void> {
  const handle = await App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(`${APP_SCHEME}://auth`)) return;
    const parsed = new URL(url);
    const ticket = parsed.searchParams.get('ticket') || parsed.searchParams.get('token');
    void Browser.close().catch(() => undefined);
    if (ticket) void onTicket(ticket);
  });
  return () => { void handle.remove(); };
}
