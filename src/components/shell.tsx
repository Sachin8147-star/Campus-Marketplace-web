import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Show, useClerk, useUser } from '@clerk/react';
import {
  ArrowRight, ChevronDown, Compass, Heart, HelpCircle, Inbox, LogOut, Package, Plus,
  ShoppingCart, UserRound, Settings2, LayoutList, LogIn, Bell,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { UnreadBadge } from '@/components/unread-badge';
import { useInboxUnread, useNotificationFeed } from '@/lib/inbox';
import { forgetPushToken } from '@/lib/native-push';

/** campuscrate logo: a crate with a heart rising out of it ("good things, passed on"). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" role="img" aria-label="campuscrate" className="brand-logo">
      <rect width="108" height="108" rx="24" fill="#285f51" />
      <path d="M54 58 C39 47 33 38.5 33 31.5 C33 25 37.5 20.5 43.5 20.5 C47.5 20.5 51.5 23 54 27 C56.5 23 60.5 20.5 64.5 20.5 C70.5 20.5 75 25 75 31.5 C75 38.5 69 47 54 58 Z" fill="#ee7b52" />
      <rect x="28" y="52" width="52" height="36" rx="7" fill="#f8efe0" />
      <rect x="28" y="52" width="52" height="9" rx="4" fill="#e6d6b8" />
      <path d="M36 70.5 H72 M36 79 H72" stroke="#285f51" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" data-testid="link-brand" className="brand flex items-center gap-2.5">
      <LogoMark />
      {!compact && <span className="brand-name">campus<span>crate</span><small>good things, passed on</small></span>}
    </Link>
  );
}

function UserAvatar({ size = 32, className = '' }: { size?: number; className?: string }) {
  const { user } = useUser();
  const initial = (user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || 'S').slice(0, 1).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };
  if (user?.hasImage && user.imageUrl) {
    return <img src={user.imageUrl} alt="" style={style} className={`rounded-full object-cover ${className}`} referrerPolicy="no-referrer" />;
  }
  return <span style={style} className={`rounded-full bg-[#285f51] text-white font-bold inline-flex items-center justify-center ${className}`}>{initial}</span>;
}

/**
 * The little menu behind the profile picture in the top-right corner.
 * It only holds things about *you* (account, orders, listings, help, sign out).
 * Browsing links (Explore, Cart, Saved, Inbox) stay in the main navigation.
 */
function ProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    { href: '/profile', label: 'My profile', Icon: UserRound },
    { href: '/account', label: 'Account details', Icon: Settings2 },
    { href: '/orders', label: 'My orders', Icon: Package },
    { href: '/dashboard', label: 'My listings', Icon: LayoutList },
    { href: '/help', label: 'Help & support', Icon: HelpCircle },
  ];

  const handleSignOut = async () => {
    setOpen(false);
    setConfirmOut(false);
    await forgetPushToken();
    await signOut();
    setLocation('/');
  };

  return (
    <>
    <div className="profile-menu relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        data-testid="button-profile-menu"
        className="flex items-center gap-1 rounded-full p-0.5 pr-1 hover:bg-[#f0ede4] transition-colors"
      >
        <UserAvatar size={34} />
        <ChevronDown size={14} className={`text-[#65766e] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-[min(18rem,calc(100vw-24px))] bg-[#fffdf8] border border-[#e6e2d8] rounded-2xl shadow-xl z-[80] overflow-hidden">
          <Link href="/profile" className="flex items-center gap-3 p-4 border-b border-[#efece3] hover:bg-[#fbfaf5]" role="menuitem">
            <UserAvatar size={44} />
            <span className="min-w-0">
              <b className="block text-sm text-[#213b34] truncate">{user?.fullName || 'Student'}</b>
              <small className="block text-[13px] text-[#65766e] truncate">{user?.primaryEmailAddress?.emailAddress}</small>
            </span>
          </Link>
          <div className="py-1.5">
            {items.map(({ href, label, Icon }) => (
              <Link key={href} href={href} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-[15px] font-semibold text-[#213b34] hover:bg-[#f7f4eb]">
                <Icon size={17} className="text-[#285f51]" />{label}
              </Link>
            ))}
          </div>
          <button onClick={() => { setOpen(false); setConfirmOut(true); }} role="menuitem" className="w-full flex items-center gap-3 px-4 py-3 border-t border-[#efece3] text-[15px] font-semibold text-[#b74b42] hover:bg-[#fef2f2]">
            <LogOut size={17} />Sign out
          </button>
        </div>
      )}
    </div>
    <ConfirmDialog open={confirmOut} title="Sign out?" icon={<LogOut size={24} />} confirmLabel="Yes, sign out" cancelLabel="No" onCancel={() => setConfirmOut(false)} onConfirm={() => void handleSignOut()}>
      Are you sure you want to sign out?
    </ConfirmDialog>
    </>
  );
}

function BellLink() {
  const feed = useNotificationFeed();
  return (
    <Link href="/notifications" aria-label="Notifications" data-testid="link-notifications" className="relative w-10 h-10 rounded-full grid place-items-center text-[#285f51] hover:bg-[#f0ede4]">
      <Bell size={21} />
      <UnreadBadge count={feed.data?.unread ?? 0} cap={9} floating label="new notifications" />
    </Link>
  );
}

function InboxNavLink() {
  const unread = useInboxUnread();
  return (
    <Link href="/inbox" className="nav-link inline-flex items-center gap-1.5" data-testid="link-inbox">Inbox<UnreadBadge count={unread.data?.people ?? 0} cap={4} label="people with new messages" /></Link>
  );
}

export function Header() {
  return (
    <header className="site-header sticky top-0 z-50 bg-[#fffdf8]/80 backdrop-blur-md border-b border-[#e6e2d8]">
      <div className="header-inner">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/" className="nav-link" data-testid="link-marketplace">Explore</Link>
          <Show when="signed-in">
            <Link href="/saved" className="nav-link" data-testid="link-saved">Saved</Link>
            <InboxNavLink />
            <Link href="/cart" className="nav-link" data-testid="link-cart">Cart</Link>
          </Show>
        </nav>
        <div className="header-actions">
          <Show when="signed-in">
            <Link href="/sell" className="button button-primary button-small desktop-only" data-testid="link-sell-header"><Plus size={16} /> List an item</Link>
            <BellLink />
            <Link href="/cart" aria-label="Cart" className="md:hidden w-10 h-10 rounded-full grid place-items-center text-[#285f51] hover:bg-[#f0ede4]"><ShoppingCart size={21} /></Link>
            <ProfileMenu />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="button button-quiet button-small" data-testid="link-sign-in-header">Sign in</Link>
            <Link href="/sign-in" className="button button-primary button-small" data-testid="link-sign-up-header">Join <span className="desktop-only ml-1">campuscrate</span> <ArrowRight size={15} /></Link>
          </Show>
        </div>
      </div>
    </header>
  );
}

function Tab({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 ${active ? 'text-[#285f51]' : 'text-[#65766e]'}`} aria-current={active ? 'page' : undefined}>
      {children}
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useUser();
  const inboxUnread = useInboxUnread();
  const is = (path: string) => (path === '/' ? location === '/' : location === path || location.startsWith(`${path}/`));
  const profileActive = ['/profile', '/account', '/orders', '/help', '/dashboard'].some(is);
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fffdf8] border-t border-[#e6e2d8] flex items-end justify-around px-1 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Bottom navigation"
    >
      <Tab href="/" label="Explore" active={is('/')}><Compass size={23} strokeWidth={is('/') ? 2.5 : 2} /></Tab>
      <Tab href="/saved" label="Saved" active={is('/saved')}><Heart size={23} strokeWidth={is('/saved') ? 2.5 : 2} /></Tab>
      <Link href="/sell" className="flex-1 flex flex-col items-center -mt-6 pb-1.5" aria-label="List an item">
        <span className="w-14 h-14 rounded-full bg-[#285f51] text-white flex items-center justify-center shadow-lg border-4 border-[#fffdf8]"><Plus size={30} /></span>
        <span className="text-[11px] font-bold text-[#285f51] mt-0.5">Sell</span>
      </Link>
      <Tab href="/inbox" label="Inbox" active={is('/inbox')}>
        <span className="relative inline-flex"><Inbox size={23} strokeWidth={is('/inbox') ? 2.5 : 2} /><UnreadBadge count={inboxUnread.data?.people ?? 0} cap={4} floating label="people with new messages" /></span>
      </Tab>
      {user ? (
        <Tab href="/profile" label="Profile" active={profileActive}>
          <span className={`rounded-full ${profileActive ? 'ring-2 ring-[#285f51] ring-offset-1' : ''}`}><UserAvatar size={24} /></span>
        </Tab>
      ) : (
        <Tab href="/sign-in" label="Sign in" active={is('/sign-in')}><LogIn size={23} /></Tab>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Brand />
        <p>Useful things find their next chapter here.</p>
        <span>Made for campus, by campus.</span>
        <nav className="footer-links" aria-label="Legal">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms &amp; conditions</Link>
          <Link href="/help">Help</Link>
        </nav>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <div className="market-shell grain pb-24 md:pb-0"><Header /><ErrorBoundary resetKey={location}>{children}</ErrorBoundary>{location === '/' && <Footer />}<BottomNav /></div>;
}

export function AppPage({ children }: { children: ReactNode }) {
  return <Shell><main className="page-wrap">{children}</main></Shell>;
}
