import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { AppPage } from '@/components/shell';

function LegalLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro: string; children: ReactNode }) {
  return (
    <AppPage>
      <div className="max-w-[720px] mx-auto">
        <Link href="/profile" className="back-link"><ArrowLeft size={16} /> Back</Link>
        <div className="page-heading">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="space-y-6 text-[18px] leading-relaxed text-[#3f5148] pb-6">{children}</div>
      </div>
    </AppPage>
  );
}

const H = ({ children }: { children: ReactNode }) => <h2 className="text-[19px] font-bold text-[#213b34] mb-2">{children}</h2>;
const List = ({ items }: { items: string[] }) => <ul className="list-disc pl-5 space-y-1.5">{items.map(i => <li key={i}>{i}</li>)}</ul>;

export function PrivacyPage() {
  return (
    <LegalLayout eyebrow="YOUR DATA, YOUR CALL" title={<>Privacy <em>policy.</em></>} intro="What campuscrate collects, why, and the choices you have.">
      <section><H>What we collect</H>
        <List items={[
          'Account details from sign-in: your name, email address, profile photo, and phone number if you add one.',
          'What you post: listings, descriptions, prices, photos, videos, and hand-over place, address details and time.',
          'Your activity: saved items, cart, orders and the messages you send or receive about listings.',
          'Basic technical data such as error logs, needed to keep the service running.',
        ]} /></section>
      <section><H>How we use it</H>
        <List items={[
          'To show your listings and let students contact each other.',
          'To show your name and profile photo on listings you create, so buyers know who they are dealing with.',
          'To keep the marketplace safe, fix problems and improve the app.',
        ]} /></section>
      <section><H>What other students can see</H>
        <p>On a listing you create, people can see your name, profile photo, phone number, email, the hand-over place and time. Only share what you are comfortable sharing. Messages are visible only to the sender and the recipient.</p></section>
      <section><H>Services we rely on</H>
        <p>Sign-in is handled by Clerk. Photos and videos are stored with Supabase. Our server and database run on Render. These providers process data on our behalf under their own privacy terms. We do not sell your personal data or use it for advertising.</p></section>
      <section><H>Your choices</H>
        <List items={[
          'Edit your name, photo and phone number any time in Profile → Account details.',
          'Delete a listing from My listings whenever you like.',
          'Delete your account any time in Profile → Account details → Delete account. This removes your listings, messages, saved items, cart and orders.',
        ]} /></section>
      <section><H>Children</H>
        <p>campuscrate is meant for college students. It is not intended for children under 13.</p></section>
      <section><H>Changes</H>
        <p>If this policy changes, the date above will be updated. Continuing to use the app means you accept the updated policy.</p></section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout eyebrow="THE GROUND RULES" title={<>Terms &amp; <em>conditions.</em></>} intro="Simple rules that keep campuscrate useful and safe for everyone.">
      <section><H>Using campuscrate</H>
        <p>campuscrate helps students buy, sell, rent and donate used items within their campus community. By using the app you agree to these terms. You must provide accurate information and keep your account secure.</p></section>
      <section><H>Your listings</H>
        <List items={[
          'Only list items you own and are allowed to sell or rent.',
          'Describe items honestly and use real photos.',
          'Do not list illegal, stolen, dangerous or prohibited items (for example weapons, drugs, alcohol, counterfeit goods or anything that infringes someone’s rights).',
          'You may not add your own listing to your own cart or place an order for it.',
        ]} /></section>
      <section><H>Deals happen between students</H>
        <p>campuscrate only connects people. Buyers and sellers agree on price, payment and hand-over themselves. We are not a party to any deal, and we do not guarantee any item, its condition or any person. Inspect items before paying and meet in safe, public places on campus.</p></section>
      <section><H>Behave well</H>
        <List items={[
          'No harassment, hate speech, spam or scams in messages or listings.',
          'Do not share other people’s personal information without permission.',
          'Do not misuse or try to break the app or its security.',
        ]} /></section>
      <section><H>Content you post</H>
        <p>You keep ownership of what you post, and you allow campuscrate to display it in the app so the service can work. We may remove content or accounts that break these rules or harm others.</p></section>
      <section><H>Availability and liability</H>
        <p>The app is provided “as is”. It may be unavailable at times, and we are not responsible for losses from deals made through it, to the extent allowed by law.</p></section>
      <section><H>Contact</H>
        <p>Questions or concerns? Use “Report a problem” in Help &amp; support.</p></section>
    </LegalLayout>
  );
}
