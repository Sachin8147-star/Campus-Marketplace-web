import { useState, type ElementType } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import {
  ChevronRight, FileText, Heart, HelpCircle, Inbox, LayoutList, LogOut, MessageCircleQuestion, Package,
  Pencil, Settings2, ShieldCheck, ShoppingCart, Lock,
} from 'lucide-react';
import { useGetDashboardSummary } from '@workspace/api-client-react';
import { AppPage } from '@/components/shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { forgetPushToken } from '@/lib/native-push';

type Row = { icon: ElementType; label: string; hint: string; href?: string; onClick?: () => void; tone?: string };

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="text-[13px] font-bold text-[#65766e] uppercase tracking-[0.14em] mb-2.5 px-1">{title}</h2>
      <div className="bg-white rounded-2xl border border-[#e6e2d8] overflow-hidden shadow-sm divide-y divide-[#f0ede4]">
        {rows.map(({ icon: Icon, label, hint, href, onClick, tone }) => {
          const inner = (
            <>
              <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone ?? 'bg-[#e8f0ec] text-[#285f51]'}`}><Icon size={20} /></span>
              <span className="flex-1 min-w-0 text-left">
                <b className="block text-[16px] text-[#213b34]">{label}</b>
                <small className="block text-[13px] text-[#65766e] leading-snug">{hint}</small>
              </span>
              <ChevronRight size={18} className="text-[#b9c2b8] shrink-0" />
            </>
          );
          const cls = 'flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#fbfaf5] active:bg-[#f4f1e8] transition-colors w-full';
          return href
            ? <Link key={label} href={href} className={cls}>{inner}</Link>
            : <button key={label} type="button" onClick={onClick} className={cls}>{inner}</button>;
        })}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [confirmOut, setConfirmOut] = useState(false);
  const summary = useGetDashboardSummary({ query: { enabled: Boolean(user), retry: 0 } as any });

  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;

  const stats = summary.data;
  const phone = user.primaryPhoneNumber?.phoneNumber;
  const initial = (user.firstName || user.username || 'S').slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    await forgetPushToken();
    await signOut();
    setLocation('/');
  };

  return (
    <AppPage>
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* Identity card */}
        <div className="bg-white rounded-3xl border border-[#e6e2d8] shadow-sm p-5">
          <div className="flex items-center gap-4">
            {user.hasImage && user.imageUrl
              ? <img src={user.imageUrl} alt="" className="w-[68px] h-[68px] rounded-full object-cover border-2 border-[#e6e2d8]" referrerPolicy="no-referrer" />
              : <span className="w-[68px] h-[68px] rounded-full bg-[#285f51] text-white text-2xl font-bold grid place-items-center">{initial}</span>}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-[#213b34] truncate leading-tight" style={{ fontFamily: 'inherit' }}>{user.fullName || 'Campus student'}</h1>
              <p className="text-[14px] text-[#65766e] truncate">{user.primaryEmailAddress?.emailAddress}</p>
              {phone && <p className="text-[14px] text-[#65766e]">{phone}</p>}
            </div>
            <Link href="/account" className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#d9ded5] text-[14px] font-bold text-[#285f51] hover:bg-[#f7f4eb]">
              <Pencil size={13} /> Edit
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5 text-center">
            {[
              { label: 'Active listings', value: stats?.activeListings, href: '/dashboard' },
              { label: 'Saved finds', value: stats?.favorites, href: '/saved' },
              { label: 'New messages', value: stats?.newInquiries, href: '/inbox' },
            ].map(s => (
              <Link key={s.label} href={s.href} className="rounded-2xl bg-[#fbfaf5] border border-[#efece3] py-3 hover:bg-[#f4f1e8]">
                <b className="block text-lg text-[#213b34]">{summary.isLoading ? '–' : (s.value ?? 0)}</b>
                <small className="text-[12px] text-[#65766e] font-semibold">{s.label}</small>
              </Link>
            ))}
          </div>
        </div>

        <Section title="My account" rows={[
          { icon: Settings2, label: 'Account details', hint: 'Name, email, phone, password & login methods', href: '/account' },
          { icon: Package, label: 'My orders', hint: 'Track hand-offs and see past orders', href: '/orders', tone: 'bg-[#e8eefb] text-[#3355a8]' },
          { icon: ShoppingCart, label: 'My cart', hint: 'Items you are ready to pick up', href: '/cart', tone: 'bg-[#fdf0e3] text-[#b0661a]' },
          { icon: LayoutList, label: 'My listings', hint: 'Manage what you are selling or renting', href: '/dashboard', tone: 'bg-[#f1e9fb] text-[#7242b5]' },
          { icon: Heart, label: 'Saved items', hint: 'Finds you hearted for later', href: '/saved', tone: 'bg-[#fdecef] text-[#c23d5a]' },
          { icon: Inbox, label: 'Messages', hint: 'Chats with buyers and sellers', href: '/inbox', tone: 'bg-[#e6f4ea] text-[#2a7a46]' },
        ]} />

        <Section title="Help & support" rows={[
          { icon: HelpCircle, label: 'Help & FAQs', hint: 'Listing, renting, hand-offs and troubleshooting', href: '/help', tone: 'bg-[#eef0f2] text-[#4a5560]' },
          { icon: ShieldCheck, label: 'Safety tips', hint: 'Meet on campus and stay safe', href: '/help?tab=safety', tone: 'bg-[#e6f4ea] text-[#2a7a46]' },
          { icon: MessageCircleQuestion, label: 'Report a problem', hint: 'Something not loading or uploading?', href: '/help?tab=report', tone: 'bg-[#fdf0e3] text-[#b0661a]' },
        ]} />

        <Section title="Legal" rows={[
          { icon: Lock, label: 'Privacy policy', hint: 'What we collect and how it is used', href: '/privacy', tone: 'bg-[#eef0f2] text-[#4a5560]' },
          { icon: FileText, label: 'Terms & conditions', hint: 'The ground rules for using campuscrate', href: '/terms', tone: 'bg-[#eef0f2] text-[#4a5560]' },
        ]} />

        <button
          onClick={() => setConfirmOut(true)}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white text-[#b74b42] font-bold rounded-2xl border border-[#f1d9d6] hover:bg-[#fef2f2] transition-colors shadow-sm"
        >
          <LogOut size={19} /> Sign out
        </button>
        <p className="text-center text-[11px] text-[#65766e] uppercase tracking-widest font-bold pb-2">CampusCrate · good things, passed on</p>
      </div>
      <ConfirmDialog open={confirmOut} title="Sign out?" icon={<LogOut size={24} />} confirmLabel="Yes, sign out" cancelLabel="No" onCancel={() => setConfirmOut(false)} onConfirm={() => { setConfirmOut(false); void handleSignOut(); }}>
        Are you sure you want to sign out?
      </ConfirmDialog>
    </AppPage>
  );
}
