import { useState, type FormEvent } from 'react';
import { Link, useSearch } from 'wouter';
import { useUser } from '@clerk/react';
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { AppPage } from '@/components/shell';
import { friendlyError } from '@/lib/errors';

const faqs = [
  { q: 'How do I list something for sale or rent?', a: 'Tap the green + Sell button, choose “Sell it” or “Rent it out”, pick a category, add a title, price, photos or a short video, tell us where and when you can hand it over, and publish. You can change a listing’s status to reserved, sold or rented from My listings at any time.' },
  { q: 'How do I contact a seller?', a: 'Open any listing and use “Ask the seller a question”. Your chat then lives in Inbox. If the seller shared a phone number you can also tap “Call seller”.' },
  { q: 'What does “My orders” show?', a: 'When you start an order from your cart, it appears in My orders with the hand-over place and time. Both you and the seller can follow it and mark the item as handed over.' },
  { q: 'Why can’t I add my own listing to the cart?', a: 'Sellers can’t buy their own items. If you try, we ask you to confirm your identity and then explain this.' },
  { q: 'My photos or videos won’t upload.', a: 'Photos can be JPG, JPEG, PNG, WebP, GIF, BMP or AVIF and videos MP4, MOV, WebM or OGG, each up to 50 MB. Check your internet connection and try again.' },
  { q: 'Something is not loading.', a: 'Check your internet connection and tap “Try again”. If it still fails, tell us under “Report a problem”.' },
];

const safety = [
  'Meet in busy campus spots like the library entrance or hostel lobby.',
  'Check the item before you pay, and pay only when you receive it.',
  'Keep chats inside the app and never share OTPs or passwords.',
  'Tell a friend where you are going for a hand-over.',
];

type Tab = 'faq' | 'safety' | 'export' | 'report';

export default function HelpPage() {
  const search = useSearch();
  const initial = (new URLSearchParams(search).get('tab') as Tab) || 'faq';
  const [tab, setTab] = useState<Tab>(['faq', 'safety', 'export', 'report'].includes(initial) ? initial : 'faq');
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState('sending'); setError('');
    try {
      await customFetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, contact }) });
      setState('sent'); setMessage('');
    } catch (e) {
      setState('idle'); setError(friendlyError(e, 'Couldn’t send your report'));
    }
  };

  const tabs: [Tab, string][] = [
    ['faq', 'FAQs'],
    ['safety', 'Safety tips'],
    ['export', 'Download zip & Vercel'],
    ['report', 'Report'],
  ];
  return (
    <AppPage>
      <div className="max-w-[680px] mx-auto">
        <Link href={user ? '/profile' : '/'} className="back-link"><ArrowLeft size={16} /> {user ? 'Back to profile' : 'Back to the shelves'}</Link>
        <div className="page-heading">
          <span className="eyebrow">WE’VE GOT YOU</span>
          <h1>Help &amp; <em>support.</em></h1>
          <p>Quick answers for listing, renting and hand-offs.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`shrink-0 h-11 px-4 rounded-full text-[17px] font-bold border ${tab === id ? 'bg-[#285f51] text-white border-[#285f51]' : 'bg-white text-[#285f51] border-[#d9ded5]'}`}>{label}</button>
          ))}
        </div>

        {tab === 'faq' && (
          <div className="space-y-3">
            {faqs.map(item => (
              <details key={item.q} className="group bg-white border border-[#e6e2d8] rounded-2xl px-4 py-4 shadow-sm open:bg-[#fffdf8]">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold text-[18px] text-[#213b34]">
                  {item.q}<span className="text-[#285f51] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[17px] leading-relaxed text-[#4f6158]">{item.a}</p>
              </details>
            ))}
          </div>
        )}

        {tab === 'safety' && (
          <section className="bg-[#e8f4ec] border border-[#cfe5d6] rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-bold text-[#1f6b3b] text-[18px]"><ShieldCheck size={20} /> Stay safe on campus</h2>
            <ul className="mt-3 text-[18px] text-[#2f5a40] leading-relaxed list-disc pl-5 space-y-2">{safety.map(s => <li key={s}>{s}</li>)}</ul>
          </section>
        )}

        {tab === 'export' && (
          <div className="space-y-4">
            <section className="bg-white border border-[#e6e2d8] rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <span className="inline-block px-3 py-1 bg-[#e8f4ec] text-[#1f6b3b] font-bold text-xs rounded-full uppercase tracking-wider mb-2">Ready to download</span>
                <h2 className="font-bold text-[20px] text-[#213b34]">Updated Project Archives</h2>
                <p className="text-[16px] text-[#65766e] mt-1">
                  Your website has been updated with everything from the APK. Both packages connect to your live backend.
                </p>
              </div>

              <div className="grid gap-3 pt-2">
                <a
                  href="/Campus-Marketplace-Frontend-Vercel.zip"
                  download="Campus-Marketplace-Frontend-Vercel.zip"
                  className="flex items-center justify-between p-4 rounded-xl border border-[#285f51] bg-[#f2f7f4] text-[#285f51] hover:bg-[#e4efe8] transition-colors"
                >
                  <div>
                    <strong className="block text-[17px] font-bold">1. Standalone Frontend (Vercel Ready)</strong>
                    <span className="text-[14px] text-[#4f6158]">Clean Vite React project configured with vercel.json &amp; .env. Quickest for Vercel.</span>
                  </div>
                  <span className="shrink-0 ml-3 px-3 py-1.5 bg-[#285f51] text-white rounded-lg text-sm font-semibold">Download ZIP</span>
                </a>

                <a
                  href="/Campus-Marketplace-Updated.zip"
                  download="Campus-Marketplace-Updated.zip"
                  className="flex items-center justify-between p-4 rounded-xl border border-[#d9ded5] bg-[#fbfaf5] text-[#213b34] hover:bg-[#f3f0e6] transition-colors"
                >
                  <div>
                    <strong className="block text-[17px] font-bold">2. Complete Project (Full Monorepo)</strong>
                    <span className="text-[14px] text-[#65766e]">Includes Updated Website, Android APK build files, Backend with migrations, and Render configs.</span>
                  </div>
                  <span className="shrink-0 ml-3 px-3 py-1.5 bg-[#213b34] text-white rounded-lg text-sm font-semibold">Download ZIP</span>
                </a>
              </div>
            </section>

            <section className="bg-white border border-[#e6e2d8] rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-[18px] text-[#213b34]">3-Step Vercel Deployment</h3>
              <ol className="text-[16px] text-[#4f6158] space-y-2 list-decimal pl-5 leading-relaxed">
                <li>Extract <strong>Campus-Marketplace-Frontend-Vercel.zip</strong> and push it to a new GitHub repository.</li>
                <li>Go to <strong>vercel.com</strong>, click <strong>Add New Project</strong>, and import your GitHub repo.</li>
                <li>Add the following Environment Variables in Vercel:
                  <div className="bg-[#f2efe6] rounded-lg p-3 font-mono text-xs text-[#213b34] mt-2 space-y-1">
                    <div>VITE_API_BASE_URL = https://campuscrate-api-1jcb.onrender.com</div>
                    <div>VITE_CLERK_PUBLISHABLE_KEY = pk_test_bW9kZXJuLWZlcnJldC05NTY0LmNsZXJrLmFjY291bnRzLmRldiQ</div>
                  </div>
                </li>
              </ol>
            </section>
          </div>
        )}

        {tab === 'report' && (
          <section className="bg-white border border-[#e6e2d8] rounded-2xl p-5 shadow-sm">
            {state === 'sent' ? (
              <div className="text-center py-4">
                <span className="w-14 h-14 rounded-full bg-[#e8f4ec] text-[#1f6b3b] grid place-items-center mx-auto mb-3"><Check size={28} /></span>
                <h2 className="font-bold text-[19px] text-[#213b34]">Thanks, we got it.</h2>
                <p className="text-[17px] text-[#65766e] mt-1">We’ll look into it as soon as we can.</p>
                <button onClick={() => setState('idle')} className="button button-secondary mt-4">Send another</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <h2 className="font-bold text-[19px] text-[#213b34]">Tell us what went wrong</h2>
                <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={3000} rows={5}
                  placeholder="What happened? Which page were you on?" className="w-full rounded-xl border border-[#d9ded5] bg-[#fbfaf5] p-3 text-[18px] focus:outline-none focus:ring-2 focus:ring-[#285f51]/25" />
                <input value={contact} onChange={e => setContact(e.target.value)} maxLength={200} placeholder="Your email or phone (optional)"
                  className="w-full h-12 rounded-xl border border-[#d9ded5] bg-[#fbfaf5] px-3 text-[18px] focus:outline-none focus:ring-2 focus:ring-[#285f51]/25" />
                {error && <p className="text-[16px] text-[#9a3b34]" role="alert">{error}</p>}
                <button disabled={state === 'sending'} className="button button-primary w-full">{state === 'sending' && <Loader2 size={16} className="animate-spin" />} Send report</button>
              </form>
            )}
          </section>
        )}
      </div>
    </AppPage>
  );
}
