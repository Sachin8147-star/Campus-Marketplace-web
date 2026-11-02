import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { App } from '@capacitor/app';
import { Loader2 } from 'lucide-react';
import { isNativeApp } from '@/lib/api-config';
import { listenForSignInTicket, openBrowserSignIn } from '@/lib/native-auth';
import { toast } from '@/hooks/use-toast';

/**
 * - Every page opens at the top (and /help#x style links still scroll to their section).
 * - In the Android app the phone's Back button goes to the previous screen of the app;
 *   only on the Explore page does it leave the app (and the next launch starts fresh).
 */
const isAuthPath = (path: string) => path.startsWith('/sign-in') || path.startsWith('/sign-up');

export function NavigationEffects() {
  const [location, setLocation] = useLocation();
  const stack = useRef<string[]>([]);
  const skipPush = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;
  const positions = useRef<Record<string, number>>({});
  const navType = useRef<'push' | 'pop'>('push');
  const replacedAt = useRef(0);

  // A "redirect" (e.g. Saved -> Sign in while signed out) is a history *replace*. It must replace the
  // entry in our back-stack too, otherwise Back returns to the page that redirects again (the jitter).
  useEffect(() => {
    const original = window.history.replaceState;
    window.history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
      replacedAt.current = performance.now();
      return original.apply(this, args);
    };
    return () => { window.history.replaceState = original; };
  }, []);

  // Remember where the person was on a page before they leave it, so Back returns to the same spot.
  useEffect(() => {
    const remember = (event: Event) => {
      positions.current[locationRef.current] = window.scrollY;
      const link = (event.target as Element | null)?.closest?.('a');
      if (link?.classList.contains('back-link')) navType.current = 'pop';
    };
    const onPop = () => { navType.current = 'pop'; };
    document.addEventListener('click', remember, true);
    window.addEventListener('popstate', onPop);
    return () => { document.removeEventListener('click', remember, true); window.removeEventListener('popstate', onPop); };
  }, []);

  useEffect(() => {
    const wasReplace = performance.now() - replacedAt.current < 400;
    if (skipPush.current) {
      skipPush.current = false;
      navType.current = 'pop';
    } else {
      const list = stack.current;
      if (wasReplace && list.length > 0) {
        list[list.length - 1] = location; // redirect: swap, do not add
      } else {
        // Leaving the sign-in pages: they never belong in the Back history.
        if (!isAuthPath(location)) while (list.length > 0 && isAuthPath(list[list.length - 1])) list.pop();
        const seen = list.lastIndexOf(location);
        if (seen >= 0) list.length = seen + 1; // going back to a page already in the stack: cut, like a browser
        else list.push(location);
      }
      // two identical neighbours would make Back appear to do nothing
      for (let i = list.length - 1; i > 0; i--) if (list[i] === list[i - 1]) list.splice(i, 1);
      if (list.length > 60) list.shift();
    }
    const saved = navType.current === 'pop' ? positions.current[location] : undefined;
    navType.current = 'push';
    if (saved) {
      const restore = (tries: number) => {
        window.scrollTo(0, saved);
        if (Math.abs(window.scrollY - saved) > 2 && tries < 30) requestAnimationFrame(() => restore(tries + 1));
      };
      restore(0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void App.addListener('backButton', () => {
      positions.current[locationRef.current] = window.scrollY;
      const list = stack.current;
      // never "go back" onto a sign-in page: that is where a signed-out visit got redirected from
      while (list.length > 1 && isAuthPath(list[list.length - 1]) && locationRef.current !== list[list.length - 1]) list.pop();
      if (list.length > 1) {
        list.pop();
        const target = list[list.length - 1];
        skipPush.current = true;
        setLocation(target, { replace: true });
      } else if (locationRef.current !== '/') {
        stack.current = ['/'];
        skipPush.current = true;
        setLocation('/', { replace: true });
      } else {
        void App.exitApp();
      }
    }).then(handle => { remove = () => { void handle.remove(); }; });
    return () => remove?.();
  }, [setLocation]);

  return null;
}

/** Receives the one-time sign-in ticket the browser hands back and finishes signing in. */
export function NativeAuthBridge() {
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void listenForSignInTicket(async ticket => {
      try {
        const attempt = await (clerk as any).client.signIn.create({ strategy: 'ticket', ticket });
        if (attempt.status !== 'complete') throw new Error('Sign-in did not complete.');
        await clerk.setActive({ session: attempt.createdSessionId });
        sessionStorage.removeItem('campuscrate_auth_pending');
        setLocation('/', { replace: true });
        toast({ title: 'Signed in', description: 'Welcome to campuscrate!' });
      } catch {
        toast({ variant: 'destructive', title: 'Couldn’t finish signing in', description: 'Please try again.' });
      }
    }).then(off => { remove = off; });

    // If the person comes back without the deep link, check whether the browser sign-in worked anyway.
    let sub: { remove: () => Promise<void> } | undefined;
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && sessionStorage.getItem('campuscrate_auth_pending') && !(clerk as any).user) {
        sessionStorage.removeItem('campuscrate_auth_pending');
        window.location.reload();
      }
    }).then(h => { sub = h; });
    return () => { remove?.(); void sub?.remove(); };
  }, [clerk, setLocation]);
  return null;
}

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** Android only: Google blocks sign-in inside the app's own WebView, so this opens a real browser tab. */
export function GoogleBrowserButton({ label = 'Continue with Google' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  if (!isNativeApp()) return null;
  const start = async () => {
    setBusy(true);
    sessionStorage.setItem('campuscrate_auth_pending', '1');
    try { await openBrowserSignIn(); } finally { setTimeout(() => setBusy(false), 1500); }
  };
  return (
    <div className="native-google">
      <button type="button" onClick={() => void start()} disabled={busy} className="w-full h-[52px] rounded-2xl border border-[#d9ded5] bg-white text-[#213b34] font-semibold text-[18px] flex items-center justify-center gap-3 shadow-sm active:bg-[#f7f4eb]">
        {busy ? <Loader2 size={20} className="animate-spin" /> : <GoogleG />} {label}
      </button>
      <p className="text-center text-[15px] text-[#65766e] mt-2">Opens your browser to sign in, then brings you back here.</p>
      <div className="flex items-center gap-3 my-4 text-[15px] text-[#65766e]"><span className="flex-1 h-px bg-[#e6e2d8]" />or use your email<span className="flex-1 h-px bg-[#e6e2d8]" /></div>
    </div>
  );
}
