import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Redirect } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { customFetch } from '@workspace/api-client-react';
import { ArrowLeft, Camera, Check, Loader2, Lock, Mail, Phone, Trash2, User } from 'lucide-react';
import { AppPage } from '@/components/shell';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { friendlyError } from '@/lib/errors';
import { SellerAvatar } from '@/components/seller-avatar';
import { toast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/media';
import { normalizePhone, validatePhone } from '@/lib/validation';

const Card = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="bg-white border border-[#e6e2d8] rounded-2xl p-5 shadow-sm">
    <h2 className="flex items-center gap-2 text-[17px] font-bold text-[#213b34] mb-4"><span className="text-[#285f51]">{icon}</span>{title}</h2>
    {children}
  </section>
);
const inputCls = 'w-full h-12 rounded-xl border border-[#d9ded5] bg-[#fbfaf5] px-3.5 text-[18px] text-[#213b34] focus:outline-none focus:ring-2 focus:ring-[#285f51]/25';
const labelCls = 'block text-[15px] font-bold uppercase tracking-wider text-[#65766e] mb-1.5';
const providerName = (p: string) => p.replace('oauth_', '').replace(/^./, c => c.toUpperCase());

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const currentPhone = String((user?.unsafeMetadata as any)?.phone ?? user?.primaryPhoneNumber?.phoneNumber ?? '');
  const [phone, setPhone] = useState(currentPhone);
  const [phoneError, setPhoneError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');

  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;

  const run = async (key: string, task: () => Promise<void>, okMessage: string) => {
    setBusy(key);
    try { await task(); toast({ title: okMessage }); }
    catch (e: any) { toast({ variant: 'destructive', title: 'That didn’t work', description: e?.errors?.[0]?.longMessage || e?.message || 'Please try again.' }); }
    finally { setBusy(null); }
  };

  const savePhoto = async (file?: File | null) => {
    if (!file) return;
    await run('photo', async () => { await user.setProfileImage({ file: await compressImage(file, 512) }); }, 'Profile photo updated');
    if (photoRef.current) photoRef.current.value = '';
  };
  const saveName = (e: FormEvent) => { e.preventDefault(); void run('name', async () => { await user.update({ firstName: firstName.trim(), lastName: lastName.trim() }); }, 'Name updated'); };
  const savePhone = (e: FormEvent) => {
    e.preventDefault();
    const problem = validatePhone(phone);
    setPhoneError(problem ?? '');
    if (problem) return;
    void run('phone', async () => { await user.update({ unsafeMetadata: { ...(user.unsafeMetadata as object), phone: normalizePhone(phone) } }); }, 'Phone number saved');
  };
  const deleteAccount = async () => {
    setBusy('delete');
    try {
      await customFetch('/api/account', { method: 'DELETE' });
      try { await signOut(); } catch { /* the session is already gone */ }
      window.location.assign('/');
    } catch (e) {
      setBusy(null);
      toast({ variant: 'destructive', title: friendlyError(e, 'Couldn’t delete your account') });
    }
  };
  const savePassword = (e: FormEvent) => { e.preventDefault(); void run('pw', async () => { await user.updatePassword({ currentPassword: pwOld, newPassword: pwNew }); setPwOld(''); setPwNew(''); }, 'Password changed'); };

  return (
    <AppPage>
      <div className="max-w-[640px] mx-auto">
        <Link href="/profile" className="back-link"><ArrowLeft size={16} /> Back to profile</Link>
        <div className="page-heading">
          <span className="eyebrow">YOUR DETAILS</span>
          <h1>Account <em>details.</em></h1>
          <p>This is exactly what buyers see on your listings.</p>
        </div>

        <div className="space-y-5">
          <section className="bg-white border border-[#e6e2d8] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="relative shrink-0">
              <SellerAvatar name={user.firstName || user.username || 'S'} imageUrl={user.hasImage ? user.imageUrl : null} className="inline-grid place-items-center w-[84px] h-[84px] rounded-full bg-[#285f51] text-white text-3xl font-bold overflow-hidden" />
              <button onClick={() => photoRef.current?.click()} aria-label="Change photo" className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#285f51] text-white grid place-items-center border-2 border-white shadow">
                {busy === 'photo' ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => void savePhoto(e.target.files?.[0])} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[20px] font-extrabold text-[#213b34] truncate">{user.fullName || 'Campus student'}</h2>
              <p className="text-[16px] text-[#65766e] truncate">{user.primaryEmailAddress?.emailAddress}</p>
              <button onClick={() => photoRef.current?.click()} className="text-[16px] font-bold text-[#285f51] mt-1">Change photo</button>
            </div>
          </section>

          <Card icon={<User size={19} />} title="Name">
            <form onSubmit={saveName} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls} htmlFor="fn">First name</label><input id="fn" className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={60} /></div>
                <div><label className={labelCls} htmlFor="ln">Last name</label><input id="ln" className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} maxLength={60} /></div>
              </div>
              <button disabled={busy === 'name'} className="button button-primary w-full">{busy === 'name' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save name</button>
            </form>
          </Card>

          <Card icon={<Phone size={19} />} title="Contact phone">
            <form onSubmit={savePhone} className="space-y-3">
              <p className="text-[16px] text-[#65766e]">Shown to buyers when you list an item. 10 to 15 digits.</p>
              <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(''); }} placeholder="+91 98765 43210" maxLength={20} />
              {phoneError && <p className="text-[16px] text-[#9a3b34]" role="alert">{phoneError}</p>}
              <button disabled={busy === 'phone'} className="button button-primary w-full">{busy === 'phone' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save phone</button>
            </form>
          </Card>

          <Card icon={<Mail size={19} />} title="Email addresses">
            <ul className="space-y-2">
              {user.emailAddresses.map(email => (
                <li key={email.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbfaf5] border border-[#efece3] px-3.5 py-3">
                  <span className="text-[17px] text-[#213b34] truncate">{email.emailAddress}</span>
                  {user.primaryEmailAddressId === email.id && <span className="text-[14px] font-bold text-[#1f6b3b] bg-[#e8f4ec] rounded-full px-2.5 py-1">Primary</span>}
                </li>
              ))}
            </ul>
            {user.externalAccounts.length > 0 && (
              <div className="mt-4">
                <p className={labelCls}>Connected accounts</p>
                <ul className="space-y-2">
                  {user.externalAccounts.map(acc => (
                    <li key={acc.id} className="rounded-xl bg-[#fbfaf5] border border-[#efece3] px-3.5 py-3 text-[17px] text-[#213b34]">
                      <b>{providerName(String(acc.provider))}</b> <span className="text-[#65766e]">· {acc.emailAddress}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {user.passwordEnabled && (
            <Card icon={<Lock size={19} />} title="Password">
              <form onSubmit={savePassword} className="space-y-3">
                <input className={inputCls} type="password" autoComplete="current-password" value={pwOld} onChange={e => setPwOld(e.target.value)} placeholder="Current password" required />
                <input className={inputCls} type="password" autoComplete="new-password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password" required minLength={8} />
                <button disabled={busy === 'pw'} className="button button-primary w-full">{busy === 'pw' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Change password</button>
              </form>
            </Card>
          )}

          <section className="bg-white border border-[#f1d9d6] rounded-2xl p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-[#b74b42] mb-2"><Trash2 size={19} /> Delete account</h2>
            <p className="text-[15px] text-[#65766e] leading-relaxed">Permanently removes your account, listings, messages, saved items, cart and orders. This can’t be undone.</p>
            <button onClick={() => { setTyped(''); setDeleteOpen(true); }} className="mt-4 w-full h-12 rounded-xl border border-[#e8b9b4] text-[#b74b42] font-bold text-[15px] hover:bg-[#fef2f2]">Delete my account</button>
          </section>
        </div>
      </div>
      <ConfirmDialog open={deleteOpen} danger icon={<Trash2 size={24} />} title="Delete your account?" confirmLabel={busy === 'delete' ? 'Deleting…' : 'Delete forever'} cancelLabel="Cancel"
        confirmDisabled={typed.trim().toUpperCase() !== 'DELETE' || busy === 'delete'} onCancel={() => setDeleteOpen(false)} onConfirm={() => void deleteAccount()}>
        <p>This permanently deletes your account, your listings, messages, saved items, cart and orders. It can’t be undone.</p>
        <p className="mt-3 font-semibold">Type DELETE to confirm.</p>
        <input value={typed} onChange={e => setTyped(e.target.value)} autoCapitalize="characters" className={`${inputCls} mt-2`} placeholder="DELETE" aria-label="Type DELETE to confirm" />
      </ConfirmDialog>
    </AppPage>
  );
}
