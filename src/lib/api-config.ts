import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

/**
 * Where the app should send its /api requests.
 *
 *  - In a browser served by the API gateway (Replit / Render) this is empty and
 *    requests stay same-origin, exactly like before.
 *  - In the Android app there is no gateway on the phone, so the app MUST know
 *    the address of the deployed backend. Priority:
 *      1. address typed in the in-app "Server settings" (saved on the phone)
 *      2. VITE_API_BASE_URL baked in at build time
 */
const STORAGE_KEY = 'campuscrate_api_url';

/**
 * The live backend. The Android app uses this automatically, so students never
 * have to type an address. If you ever move the backend, change it here (or set
 * VITE_API_BASE_URL) and rebuild the APK.
 */
export const DEFAULT_API_URL = 'https://campuscrate-api-1jcb.onrender.com';

export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
};

const clean = (url: string) => url.trim().replace(/\/+$/, '').replace(/\/api$/, '');

export function getSavedApiUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function getApiBaseUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_API_BASE_URL as string | undefined) : undefined)?.trim();
  // If explicitly specified in .env / Vercel env, use it.
  // Otherwise, default to the live backend URL (DEFAULT_API_URL) so both APK and Website share the live backend!
  const built = envUrl || DEFAULT_API_URL;
  return clean(getSavedApiUrl() || built);
}

export function saveApiUrl(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(STORAGE_KEY, clean(url));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be unavailable in private mode */
  }
}

export function normalizeApiUrl(url: string): string {
  return clean(url);
}

/** Turns a stored media path ("/storage/...") or absolute URL into something an <img> can load. */
export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiBaseUrl();
  return base && url.startsWith('/') ? `${base}${url}` : url;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const clerk = (window as any).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

/** Call once at start-up (and never again: changing the server reloads the app). */
export function initApi(): void {
  const base = getApiBaseUrl();
  setBaseUrl(base || null);
  // Cross-origin requests (the Android app) cannot rely on cookies, so send the
  // Clerk session token as a Bearer header. Same-origin web keeps using cookies.
  setAuthTokenGetter(base ? getAuthToken : null);
}

export async function testServer(url: string): Promise<{ ok: boolean; message: string }> {
  const target = clean(url);
  if (!/^https?:\/\//i.test(target)) {
    return { ok: false, message: 'Address must start with http:// or https://' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${target}/api/healthz`, { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    if (res.ok && text.includes('"ok"')) return { ok: true, message: 'Connected. The server is up.' };
    return { ok: false, message: `The address answered, but not like the Campus API (HTTP ${res.status}).` };
  } catch (error) {
    const reason = error instanceof DOMException && error.name === 'AbortError' ? 'timed out' : 'could not be reached';
    return { ok: false, message: `The server ${reason}. Check the address, your internet, and that the backend is running.` };
  }
}

export type ServerReport = {
  reachable: boolean;
  loginRecognised: boolean | null;
  database: boolean | null;
  messagesReady: boolean | null;
  storageReady: boolean | null;
  note: string;
};

/** Everything Help -> "Check connection" shows: server, login, database, messages, photo storage. */
export async function inspectServer(): Promise<ServerReport> {
  const base = getApiBaseUrl();
  const report: ServerReport = { reachable: false, loginRecognised: null, database: null, messagesReady: null, storageReady: null, note: '' };
  const get = async (path: string, withAuth = false) => {
    const headers: Record<string, string> = {};
    if (withAuth && base) {
      const token = await getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${base}${path}`, { headers, signal: controller.signal, credentials: base ? 'omit' : 'include' });
      return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    const health = await get('/api/healthz');
    report.reachable = health.ok;
  } catch {
    report.note = 'The server could not be reached. If it is on a free plan it may be waking up; wait 30 seconds and retry.';
    return report;
  }
  try {
    const who = await get('/api/whoami', true);
    report.loginRecognised = Boolean(who.json?.signedIn);
  } catch { /* leave null */ }
  try {
    const diag = await get('/api/diag');
    if (diag.ok && diag.json) {
      report.database = Boolean(diag.json.database);
      report.messagesReady = Boolean(diag.json.inquiryRecipientColumn);
      report.storageReady = Boolean(diag.json.storageConfigured);
    } else {
      report.note = 'The server is running an older version. Deploy the latest code on Render.';
    }
  } catch { /* leave null */ }
  return report;
}
