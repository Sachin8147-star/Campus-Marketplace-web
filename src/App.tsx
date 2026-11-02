import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser, ClerkLoading, ClerkLoaded } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import {
  ArrowDownWideNarrow, ArrowLeft, ArrowRight, BookOpen, Bike, Check, CircleHelp, Clock3, Compass,
  Heart, Inbox, Laptop, MapPin, MessageCircle, PackageCheck, Play, Plus, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, Tag, Trash2, Upload, X, ShoppingCart,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey, getGetFavoritesQueryKey, getGetInquiriesQueryKey,
  getGetListingQueryKey, getGetMyListingsQueryKey, getListListingsQueryKey, useAddFavorite,
  useCreateInquiry, useCreateListing, useDeleteListing, useGetDashboardSummary, useGetFavorites,
  useGetInquiries, useGetListing, useGetMyListings, useHealthCheck, useListListings,
  useRemoveFavorite, useUpdateListing, customFetch, ApiError,
} from '@workspace/api-client-react';
import type { Listing, ListingInput, ListingStatus } from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppPage, Brand, Shell } from '@/components/shell';
import { EmptyState, ErrorState } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SellerAvatar } from '@/components/seller-avatar';
import { GoogleBrowserButton, NativeAuthBridge, NavigationEffects } from '@/components/native-nav';
import { toast } from '@/hooks/use-toast';
import { useSaveToggle } from '@/hooks/use-save-toggle';
import { CATEGORIES, categoryIcon } from '@/lib/categories';
import { friendlyError } from '@/lib/errors';
import { formatTimeRange, normalizePhone, validatePhone, validatePincode } from '@/lib/validation';
import { isNativeApp } from '@/lib/api-config';
import { PrivacyPage, TermsPage } from '@/pages/legal';
import NotificationsPage from '@/pages/notifications';
import { UnreadBadge } from '@/components/unread-badge';
import { NotificationWatcher } from '@/components/notification-watcher';
import { notificationsKey, unreadKey, useInboxUnread } from '@/lib/inbox';
import { isVideoUrl } from '@/lib/media';
import { resolveMediaUrl } from '@/lib/api-config';
import { uploadMedia } from '@/lib/upload';
import NotFound from '@/pages/not-found';
import ProfilePage from '@/pages/profile';
import AccountPage from '@/pages/account';
import HelpPage from '@/pages/help';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
const basePath = import.meta.env.BASE_URL === '.' || import.meta.env.BASE_URL === './' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bW9kZXJuLWZlcnJldC05NTY0LmNsZXJrLmFjY291bnRzLmRldiQ';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance: any = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { unsafe_disableDevelopmentModeWarnings: true, logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#285f51', colorForeground: '#213b34', colorMutedForeground: '#65766e',
    colorDanger: '#b74b42', colorBackground: '#fffdf8', colorInput: '#f7f4eb',
    colorInputForeground: '#213b34', colorNeutral: '#d9ded5', fontFamily: 'DM Sans',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center py-4',
    cardBox: 'bg-[#fffdf8] rounded-[24px] w-full max-w-[440px] overflow-hidden shadow-xl border border-[#e6e2d8]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none !p-6',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none !p-6 !pt-0',
    headerTitle: 'text-[#213b34] font-bold text-2xl',
    headerSubtitle: 'text-[#65766e]',
    socialButtonsBlockButtonText: 'text-[#213b34] font-semibold',
    formFieldLabel: 'text-[#29473e] font-semibold',
    footerActionLink: 'text-[#285f51] font-semibold',
    footerActionText: 'text-[#65766e]',
    dividerText: 'text-[#65766e]',
    identityPreviewEditButton: 'text-[#285f51]',
    formFieldSuccessText: 'text-[#285f51]',
    alertText: 'text-[#8e3b34]',
    logoBox: 'mb-4',
    logoImage: 'rounded-xl h-10 w-10',
    socialButtonsBlockButton: 'rounded-xl border-[#d9ded5] bg-[#fbfaf5] h-12',
    formButtonPrimary: 'rounded-xl bg-[#285f51] hover:bg-[#1d4d41] text-[#fffdf8] h-11',
    formFieldInput: 'rounded-xl border-[#d9ded5] bg-[#f7f4eb] text-[#213b34] h-11',
    footerAction: 'border-t border-[#e6e2d8] !bg-[#fbfaf5]',
    dividerLine: 'bg-[#e6e2d8]',
    alert: 'rounded-xl border border-[#f5e6e6] bg-[#fef2f2]',
    otpCodeFieldInput: 'rounded-lg border-[#d9ded5]',
    formFieldRow: 'gap-3',
    main: 'gap-6',
    ...(isNativeApp() ? { socialButtonsRoot: '!hidden', dividerRow: '!hidden' } : {}),
  },
  layout: { unsafe_disableDevelopmentModeWarnings: true },
};

const categories = ['All finds', ...CATEGORIES.map(c => c.name)];
const categoryOptions = CATEGORIES.map(c => c.name);
const ACCEPT_MEDIA = 'image/*,.png,.jpg,.jpeg,.jfif,.webp,.gif,.bmp,.avif,video/*,.mp4,.m4v,.mov,.webm,.ogg,.3gp';
const ACCEPT_PHOTO = 'image/*,.png,.jpg,.jpeg,.jfif,.webp,.gif,.bmp,.avif';
const conditionLabels: Record<string, string> = { new: 'New', 'like-new': 'Like new', good: 'Good', fair: 'Fair' };
const statusLabels: Record<string, string> = { available: 'Available', reserved: 'Reserved', sold: 'Sold', rented: 'Rented' };

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function useInvalidateMarketplace(listingId?: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: getListListingsQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetInquiriesQueryKey() });
    if (listingId !== undefined) void qc.invalidateQueries({ queryKey: getGetListingQueryKey(listingId) });
  };
}

function Protected({ children }: { children: ReactNode }) {
  return <><Show when="signed-in">{children}</Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}

function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');
  const params = useMemo(() => ({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category ? { category } : {}),
    ...(type ? { listingType: type as 'sale' | 'rent' } : {}),
    ...(condition ? { condition: condition as 'new' | 'like-new' | 'good' | 'fair' } : {}),
    status: 'available' as const,
    sortBy: sort as 'newest' | 'price-low' | 'price-high',
  }), [search, category, type, condition, sort]);
  const { data: listings, isLoading, isError, error, refetch } = useListListings(params);
  const { data: health } = useHealthCheck();
  const rows = Array.isArray(listings) ? listings : [];

  return (
    <Shell>
      <section className="hero">
        <div className="hero-content rise-in">
          <div className="eyebrow"><span className="eyebrow-line"></span> THE CAMPUS CIRCULAR</div>
          <h1>Find the things<br />that <em>get you there.</em></h1>
          <p className="hero-copy">Good books, lab gear, and all the little things that make campus life work — from someone just down the hall.</p>
          <div className="hero-search">
            <Search size={19} />
            <input aria-label="Search listings" data-testid="input-search" placeholder="Try “engineering maths” or “cycle”" value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={() => document.getElementById('market-grid')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-search">Search</button>
          </div>
          <div className="hero-meta"><ShieldCheck size={15} /> Student-to-student, campus-close <span className="meta-dot"></span> <span className={`health-dot ${health?.status ? 'is-live' : ''}`}></span> Community listings</div>
        </div>
        <div className="hero-art" aria-label="Campus finds illustration">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div className="art-sun"></div>
          <div className="art-book"><span>FIELD NOTES</span><b>THE<br />GOOD<br />FIND</b><i>no. 04</i></div>
          <div className="art-tag">PASS IT<br />FORWARD</div>
          <div className="art-sticker">useful<br />is beautiful</div>
          <div className="hero-art-caption">Every item has<br />another semester in it.</div>
        </div>
        <div className="hero-bottom-rule"><span>01 / FIND</span><span>02 / CONNECT</span><span>03 / KEEP IT MOVING</span></div>
      </section>
      <section className="browse-section" id="market-grid">
        <div className="section-heading">
          <div><span className="eyebrow">THE GOOD STUFF, NEARBY</span><h2>What are you <em>looking for?</em></h2></div>
          <p>Browse what your campus community<br className="desktop-only" /> has ready for its next owner.</p>
        </div>
        <div className="category-row" aria-label="Filter by category">
          {categories.map(label => {
            const Icon = label === 'All finds' ? null : categoryIcon(label);
            const value = label === 'All finds' ? '' : label;
            return <button key={label} className={`category-pill ${category === value ? 'selected' : ''}`} onClick={() => setCategory(value)} data-testid={`filter-category-${label.toLowerCase().replaceAll(' ', '-')}`}>{Icon && <Icon size={17} />}{label}</button>;
          })}
        </div>
        <div className="filter-bar">
          <div className="filter-group" aria-label="Listing type">
            <button className={!type ? 'active' : ''} onClick={() => setType('')} data-testid="filter-all">Everything</button>
            <button className={type === 'sale' ? 'active' : ''} onClick={() => setType(type === 'sale' ? '' : 'sale')} data-testid="filter-sale"><Tag size={14} /> For sale</button>
            <button className={type === 'rent' ? 'active' : ''} onClick={() => setType(type === 'rent' ? '' : 'rent')} data-testid="filter-rent"><Clock3 size={14} /> For rent</button>
          </div>
          <div className="filter-selects">
            <label className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Condition" value={condition} onChange={e => setCondition(e.target.value)} data-testid="select-condition"><option value="">Any condition</option><option value="new">New</option><option value="like-new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></label>
            <label className="select-wrap"><ArrowDownWideNarrow size={15} /><select aria-label="Sort listings" value={sort} onChange={e => setSort(e.target.value)} data-testid="select-sort"><option value="newest">Just added</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
          </div>
        </div>
        {isLoading ? <ListingSkeleton /> : isError ? <ErrorState retry={() => void refetch()} error={error} /> : rows.length ? (
          <div className="listing-grid">
            {rows.map((item, index) => <ListingCard key={item.id} item={item} index={index} />)}
          </div>
        ) : <EmptyState title="Nothing on this shelf yet." body="Try a different filter, or be the first to put a useful thing back in circulation." action={<Link href="/sell" className="button button-primary" data-testid="link-empty-sell"><Plus size={16} /> List something</Link>} />}
        <div className="browse-footnote"><Sparkles className="small-star" size={14} /> Less waste, more campus life. Every time.</div>
      </section>
      <section className="how-strip"><div className="how-intro"><span className="eyebrow">SIMPLE AS PASSING IT ON</span><h2>Good finds.<br /><em>Good people.</em></h2></div><div className="how-step"><span>01</span><b>Spot your thing</b><p>Search by what you need, then find it close by.</p></div><div className="how-step"><span>02</span><b>Talk to a student</b><p>Ask a question and arrange a hand-off that works.</p></div><div className="how-step"><span>03</span><b>Keep it in play</b><p>Buy or borrow the useful stuff. Give it a next life.</p></div></section>
    </Shell>
  );
}

function ListingSkeleton() {
  return <div className="listing-grid" aria-label="Loading listings">{[0, 1, 2, 3].map(i => <div className="skeleton-card" key={i}><div className="skeleton-image shimmer"></div><div className="skeleton-line shimmer"></div><div className="skeleton-line short shimmer"></div></div>)}</div>;
}

function CoverMedia({ item, alt = '' }: { item: Listing; alt?: string }) {
  const urls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  const photo = urls.find(u => !isVideoUrl(u));
  if (photo) return <img src={resolveMediaUrl(photo)} alt={alt || item.title} loading="lazy" />;
  const clip = urls.find(isVideoUrl);
  if (clip) return <video src={resolveMediaUrl(clip)} muted playsInline preload="metadata" className="w-full h-full object-cover" />;
  return <FallbackArt category={item.category} />;
}

function MediaGallery({ item }: { item: Listing }) {
  const media = (Array.isArray(item.imageUrls) ? item.imageUrls : []).map(resolveMediaUrl);
  const [active, setActive] = useState(0);
  const current = media[Math.min(active, Math.max(media.length - 1, 0))];
  return (
    <>
      <div className="detail-main-image photo-frame">
        {current
          ? isVideoUrl(current)
            ? <video key={current} src={current} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
            : <img src={current} alt={item.title} />
          : <FallbackArt category={item.category} />}
      </div>
      {media.length > 1 && (
        <div className="detail-thumbnails overflow-x-auto">
          {media.map((url, i) => (
            <button key={url} type="button" onClick={() => setActive(i)} aria-label={`Show media ${i + 1}`}
              className={`relative shrink-0 rounded-[11px] overflow-hidden ${i === active ? 'ring-2 ring-[#285f51]' : 'opacity-80'}`}>
              {isVideoUrl(url)
                ? <><video src={url} muted playsInline preload="metadata" className="w-[90px] h-[83px] object-cover bg-black" /><span className="absolute inset-0 grid place-items-center bg-black/25 text-white"><Play size={20} fill="currentColor" /></span></>
                : <img src={url} alt={`${item.title} view ${i + 1}`} />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ListingCard({ item, index = 0 }: { item: Listing; index?: number }) {
  const { saved: isSaved, toggle, busy } = useSaveToggle(item);
  return (
    <article className={`listing-card rise-in delay-${Math.min(index % 4, 3)}`} data-testid={`card-listing-${item.id}`}>
      <Link href={`/listing/${item.id}`} className="card-image-link" data-testid={`link-listing-${item.id}`}>
        <div className="card-image photo-frame">
          <CoverMedia item={item} />
          <span className={`type-badge ${item.listingType}`}>{item.listingType === 'rent' ? 'For rent' : 'For sale'}</span>
        </div>
      </Link>
      <button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? 'Remove from saved' : 'Save for later'} onClick={toggle} disabled={busy} data-testid={`button-save-${item.id}`}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'} /></button>
      <div className="card-body">
        <div className="card-meta"><span>{item.category}</span><span className="meta-separator">·</span><span>{conditionLabels[item.condition] || item.condition}</span></div>
        <Link href={`/listing/${item.id}`} className="card-title" data-testid={`link-title-${item.id}`}>{item.title}</Link>
        <div className="card-bottom"><strong>{currency(item.price)}<small>{item.listingType === 'rent' ? ` / ${item.priceUnit}` : ''}</small></strong><span className="card-location"><MapPin size={13} />{item.location}</span></div>
        <Link href={`/listing/${item.id}`} className="seller-line" data-testid={`link-seller-${item.id}`}><SellerAvatar name={item.sellerName} imageUrl={item.sellerImageUrl} /><span>From {item.sellerName}</span><ArrowRight size={14} /></Link>
      </div>
    </article>
  );
}

function FallbackArt({ category }: { category: string }) {
  const Icon = categoryIcon(category);
  return <div className={`fallback-art art-${category.toLowerCase().replaceAll(' ', '-')}`}><div className="fallback-shape"></div><span className="fallback-icon"><Icon size={47} strokeWidth={1.2} /></span><span className="fallback-label">{category}</span></div>;
}

function HandoverCard({ item }: { item: Listing }) {
  const m = item.meetup ?? {};
  const place = m.place || item.location;
  const cityLine = [m.city, m.pincode].filter(Boolean).join(' – ');
  const address = [m.house, m.street, m.landmark || '', cityLine].filter(Boolean).join(', ');
  const time = formatTimeRange(m.timeFrom, m.timeTo);
  const [zoom, setZoom] = useState(false);
  return (
    <div className="handover-card">
      <h3><MapPin size={18} /> Hand-over details</h3>
      <dl>
        <div><dt>Meeting place</dt><dd>{place}</dd></div>
        {address && <div><dt>Address</dt><dd>{address}</dd></div>}
        {time && <div><dt>Available time</dt><dd>{time}</dd></div>}
      </dl>
      {m.photoUrl && (
        <>
          <button type="button" className="handover-photo" onClick={() => setZoom(true)} aria-label="View meeting place photo"><img src={resolveMediaUrl(m.photoUrl)} alt="Meeting place" /><span>Meeting place photo</span></button>
          {zoom && <div className="fixed inset-0 z-[110] bg-black/80 grid place-items-center p-4" onClick={() => setZoom(false)}><img src={resolveMediaUrl(m.photoUrl)} alt="Meeting place" className="max-h-full max-w-full rounded-2xl" /></div>}
        </>
      )}
    </div>
  );
}

function ListingDetail({ id }: { id: number }) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { data: item, isLoading, isError, error, refetch } = useGetListing(id);
  const [message, setMessage] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const createInquiry = useCreateInquiry();
  const invalidate = useInvalidateMarketplace();
  const save = useSaveToggle({ id, title: item?.title ?? '' });
  if (isLoading) return <AppPage><div className="detail-skeleton shimmer"></div></AppPage>;
  if (isError || !item) return <AppPage><ErrorState retry={() => void refetch()} error={error} /></AppPage>;
  const isOwner = Boolean(user && user.id === item.sellerId);

  const addToCart = async () => {
    if (!user) { setLocation('/sign-in'); return; }
    if (isOwner) { setIdentityOpen(true); return; }
    setAddingToCart(true);
    try {
      const result: any = await customFetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: item.id, quantity: 1 }) });
      toast({ title: result?.alreadyInCart ? 'Already in your cart' : 'Added to cart', description: item.title });
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.code === 'OWN_LISTING') setIdentityOpen(true);
      else toast({ variant: 'destructive', title: friendlyError(err, 'Couldn’t add to cart') });
    } finally {
      setAddingToCart(false);
    }
  };

  const submitInquiry = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setFormError('');
    if (senderPhone.trim()) {
      const problem = validatePhone(senderPhone);
      setPhoneError(problem ?? '');
      if (problem) return;
    }
    createInquiry.mutate(
      { id: item.id, data: { senderName: user.fullName || user.firstName || 'Student', senderPhone: senderPhone.trim() ? normalizePhone(senderPhone) : null, message: message.trim() } },
      {
        onSuccess: () => { setMessage(''); invalidate(); toast({ title: 'Message sent', description: 'You can follow the chat in your Inbox.' }); },
        onError: err => setFormError(friendlyError(err, 'Your message did not send')),
      },
    );
  };

  return (
    <AppPage>
      <Link href="/" className="back-link" data-testid="link-back-market"><ArrowLeft size={16} /> Back to the shelves</Link>
      <div className="detail-layout">
        <div className="detail-visual">
          <MediaGallery item={item} />
          <div className="trust-note"><ShieldCheck size={18} /><span><b>Campus-to-campus</b><small>Connect directly and arrange a safe hand-off nearby.</small></span></div>
        </div>
        <div className="detail-info">
          <div className="detail-kicker"><span>{item.category}</span><span>·</span><span>{conditionLabels[item.condition]}</span><span className={`status-chip ${item.status}`}>{statusLabels[item.status]}</span></div>
          <h1>{item.title}</h1>
          <div className="detail-price">{currency(item.price)}{item.listingType === 'rent' && <span> / {item.priceUnit}</span>}</div>
          <p className="detail-description">{item.description}</p>
          {item.availableFrom && <div className="detail-location"><Clock3 size={16} /> Available from {new Date(item.availableFrom).toLocaleDateString()}</div>}
          <HandoverCard item={item} />
          <Link href={isOwner ? '/profile' : `/seller/${encodeURIComponent(item.sellerId)}`} className="seller-card" data-testid="link-seller-profile"><SellerAvatar name={item.sellerName} imageUrl={item.sellerImageUrl} className="seller-avatar" /><span><small>LISTED BY</small><b>{item.sellerName}</b><small>{isOwner ? 'This is your listing' : 'View profile'}</small></span><ArrowRight className="seller-check" size={19} /></Link>
          <div className="detail-actions">
            <button className="button button-primary" onClick={() => void addToCart()} disabled={addingToCart} data-testid="button-add-to-cart">
              <ShoppingCart size={17} /> {addingToCart ? 'Adding…' : 'Add to cart'}
            </button>
            <button className="button button-secondary" disabled={save.busy} onClick={save.toggle} data-testid="button-detail-save"><Heart size={17} fill={save.saved ? 'currentColor' : 'none'} />{save.saved ? 'Saved' : 'Save for later'}</button>
            {item.sellerPhone && <a className="button button-quiet" href={`tel:${item.sellerPhone}`} data-testid="link-seller-call"><MessageCircle size={17} /> Call seller</a>}
          </div>
          {item.sellerEmail && <a href={`mailto:${item.sellerEmail}`} className="email-link" data-testid="link-seller-email">{item.sellerEmail}</a>}
          <form className="inquiry-form" onSubmit={submitInquiry} noValidate>
            <h3>Ask the seller a question</h3>
            {isOwner ? <p className="form-help">This is your own listing. Buyers’ questions will appear in your Inbox.</p> : !user ? (
              <div className="sign-in-prompt"><p>Sign in to message the seller and keep the conversation in your inbox.</p><Link href="/sign-in" className="button button-primary" data-testid="link-inquiry-signin">Sign in to ask <ArrowRight size={15} /></Link></div>
            ) : (
              <>
                <textarea value={message} required minLength={5} maxLength={2000} onChange={e => setMessage(e.target.value)} placeholder="Is this still available? Could I pick it up after class?" aria-label="Your message" data-testid="input-inquiry-message" />
                <input type="tel" inputMode="tel" maxLength={20} value={senderPhone} onChange={e => { setSenderPhone(e.target.value); setPhoneError(''); }} placeholder="Your phone (optional, 10 to 15 digits)" aria-label="Your phone number" data-testid="input-inquiry-phone" />
                {phoneError && <p className="form-error" role="alert">{phoneError}</p>}
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="button button-primary inquiry-submit" disabled={createInquiry.isPending || message.trim().length < 5} data-testid="button-send-inquiry">{createInquiry.isPending ? 'Sending…' : 'Send inquiry'}<ArrowRight size={16} /></button>
                <small className="form-help">Your inquiry goes to the seller’s campuscrate inbox.</small>
              </>
            )}
          </form>
        </div>
      </div>
      <ConfirmDialog open={identityOpen} title="Confirm your identity" confirmLabel="Go to my listings" cancelLabel="Close" onConfirm={() => { setIdentityOpen(false); setLocation('/dashboard'); }} onCancel={() => setIdentityOpen(false)}>
        You’re signed in as the seller of “{item.title}”. Sellers can’t add their own items to a cart, so this one can’t be added. You can manage it from My listings.
      </ConfirmDialog>
    </AppPage>
  );
}

function SellPage() {
  const { user } = useUser();
  const [kind, setKind] = useState<'sale' | 'rent'>('sale');
  const [formCategory, setFormCategory] = useState('');
  const [condition, setCondition] = useState<ListingInput['condition']>('good');
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const profilePhone = String((user?.unsafeMetadata as any)?.phone ?? user?.primaryPhoneNumber?.phoneNumber ?? '');
  const [phone, setPhone] = useState(profilePhone);
  const [place, setPlace] = useState('');
  const [house, setHouse] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [meetupPhoto, setMeetupPhoto] = useState('');
  const [meetupBusy, setMeetupBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const meetupRef = useRef<HTMLInputElement>(null);
  const create = useCreateListing();
  const invalidate = useInvalidateMarketplace();
  const MAX_MEDIA = 8;
  const fail = (key: string, message: string) => setErrors(current => ({ ...current, [key]: message }));
  const Err = ({ k }: { k: string }) => (errors[k] ? <small className="field-error" role="alert">{errors[k]}</small> : null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, MAX_MEDIA - uploads.length));
    if (!list.length) { setUploadError(`You can add up to ${MAX_MEDIA} photos or videos.`); return; }
    setUploading(true); setUploadError('');
    const problems: string[] = [];
    for (const file of list) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      setPending(current => [...current, { id, name: file.name, progress: 0 }]);
      try {
        const url = await uploadMedia(file, progress => setPending(current => current.map(p => p.id === id ? { ...p, progress } : p)));
        setUploads(current => [...current, url]);
      } catch (error) {
        problems.push(error instanceof Error ? error.message : `“${file.name}” couldn’t be uploaded.`);
      } finally {
        setPending(current => current.filter(p => p.id !== id));
      }
    }
    if (files.length > list.length) problems.push(`Only the first ${MAX_MEDIA} files were used.`);
    setUploadError(problems.join(' '));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadMeetupPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setMeetupBusy(true); fail('meetupPhoto', '');
    try { setMeetupPhoto(await uploadMedia(file)); }
    catch (error) { fail('meetupPhoto', error instanceof Error ? error.message : 'Couldn’t upload that photo.'); }
    finally { setMeetupBusy(false); if (meetupRef.current) meetupRef.current.value = ''; }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    const found: Record<string, string> = {};
    if (!formCategory) found.category = 'Please choose a category.';
    if (!place.trim()) found.place = 'Enter the meeting place in detail.';
    const phoneProblem = validatePhone(phone);
    if (phoneProblem) found.phone = phoneProblem;
    if (pincode && validatePincode(pincode)) found.pincode = 'Pincode must be 6 digits.';
    if (!timeFrom || !timeTo) found.time = 'Tell buyers when you are free to hand it over.';
    setErrors(found);
    if (Object.keys(found).length) {
      toast({ variant: 'destructive', title: 'Please fix the highlighted fields' });
      document.querySelector('.field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const form = new FormData(event.currentTarget);
    const priceUnit = kind === 'sale' ? 'one-time' : String(form.get('priceUnit')) as ListingInput['priceUnit'];
    const data: ListingInput = {
      title: String(form.get('title')).trim(), description: String(form.get('description')).trim(),
      category: formCategory, listingType: kind,
      price: Number(form.get('price')), priceUnit, condition,
      location: place.trim(),
      // Name, e-mail and phone come from the seller's profile (the server uses the profile as the source of truth).
      sellerName: user?.fullName || user?.firstName || '', sellerPhone: normalizePhone(phone), sellerEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      meetup: { place: place.trim(), house: house.trim(), street: street.trim(), landmark: landmark.trim(), city: city.trim(), pincode: pincode.trim(), photoUrl: meetupPhoto, timeFrom, timeTo },
      availableFrom: kind === 'rent' ? String(form.get('availableFrom')) || null : null,
      availableUntil: kind === 'rent' ? String(form.get('availableUntil')) || null : null,
      imageUrls: uploads,
    };
    if (formCategory === 'Accommodation') {
      data.description = `Room: ${form.get('roomType')}, Furnishing: ${form.get('furnishing')}\n\n${data.description}`;
    }
    // Keep the phone on the profile so every listing shows exactly what the profile says.
    if (user && normalizePhone(phone) !== profilePhone) {
      try { await user.update({ unsafeMetadata: { ...(user.unsafeMetadata as object), phone: normalizePhone(phone) } }); } catch { /* not fatal */ }
    }
    create.mutate({ data }, { onSuccess: () => { setSuccess(true); invalidate(); }, onError: error => setSubmitError(friendlyError(error, 'We couldn’t publish your listing')) });
  };

  const reset = () => {
    setSuccess(false); setUploads([]); setFormCategory(''); setPlace(''); setHouse(''); setStreet(''); setLandmark(''); setCity(''); setPincode(''); setTimeFrom(''); setTimeTo(''); setMeetupPhoto('');
  };

  return <AppPage>
    <div className="form-page-heading"><Link href="/dashboard" className="back-link" data-testid="link-back-dashboard"><ArrowLeft size={16} /> My listings</Link><span className="eyebrow">PUT IT BACK IN PLAY</span><h1>List something <em>useful.</em></h1><p>A good listing helps the right person find it. Keep it clear, keep it honest.</p></div>
    {success ? <div className="publish-success"><span className="success-seal"><Check size={26} /></span><span className="eyebrow">IT'S OUT THERE</span><h2>Your listing is live.</h2><p>Someone on campus might need exactly this.</p><div className="success-actions"><Link href="/dashboard" className="button button-primary" data-testid="link-success-dashboard">Manage listing</Link><button className="button button-secondary" onClick={reset} data-testid="button-list-another">List another item</button></div></div> :
      <form className="sell-form" onSubmit={e => void submit(e)} noValidate>
        <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>What are you passing on?</h2><p>Start with the basics.</p></div></div>
          <div className="listing-kind-toggle"><button type="button" onClick={() => setKind('sale')} className={kind === 'sale' ? 'chosen' : ''} data-testid="button-kind-sale"><Tag size={17} /> Sell it</button><button type="button" onClick={() => setKind('rent')} className={kind === 'rent' ? 'chosen' : ''} data-testid="button-kind-rent"><Clock3 size={17} /> Rent it out</button></div>
          <label className="field-label">Listing title<input name="title" minLength={3} maxLength={120} required placeholder={kind === 'rent' && formCategory === 'Accommodation' ? 'e.g. Spacious 1BHK near North Gate' : 'e.g. Stewart Calculus, 8th edition'} data-testid="input-listing-title" /></label>
          <div className="field-label">Category<Err k="category" />
            <div className="category-picker" role="radiogroup" aria-label="Category" data-testid="select-listing-category">
              {CATEGORIES.map(({ name, icon: Icon }) => (
                <button type="button" key={name} role="radio" aria-checked={formCategory === name} className={formCategory === name ? 'chosen' : ''} onClick={() => { setFormCategory(name); fail('category', ''); }}><Icon size={22} /><span>{name}</span></button>
              ))}
            </div>
          </div>
          <div className="field-label">Condition
            <div className="condition-picker" role="radiogroup" aria-label="Condition" data-testid="select-listing-condition">
              {([['new', 'New'], ['like-new', 'Like new'], ['good', 'Good'], ['fair', 'Fair']] as const).map(([value, label]) => (
                <button type="button" key={value} role="radio" aria-checked={condition === value} className={condition === value ? 'chosen' : ''} onClick={() => setCondition(value)}>{label}</button>
              ))}
            </div>
          </div>
          {formCategory === 'Accommodation' && (
            <div className="accommodation-extra-fields bg-[#f7f4eb] p-4 rounded-xl mb-4 border border-[#e6e2d8]">
              <h4 className="text-[17px] font-bold text-[#285f51] mb-3 flex items-center gap-2"><MapPin size={15} /> Accommodation details</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="field-label !mb-0">Room type<select name="roomType"><option value="single">Single room</option><option value="shared">Shared room</option><option value="flat">Full flat / apartment</option></select></label>
                <label className="field-label !mb-0">Furnishing<select name="furnishing"><option value="furnished">Fully furnished</option><option value="semi">Semi-furnished</option><option value="unfurnished">Unfurnished</option></select></label>
              </div>
            </div>
          )}
          <label className="field-label">Description<textarea name="description" minLength={10} maxLength={3000} required placeholder={formCategory === 'Accommodation' ? 'Mention amenities like WiFi, food, laundry, distance from campus, etc.' : 'What should someone know? Add details, what’s included, and any quirks.'} data-testid="input-listing-description" /></label>
        </section>

        <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Price & timing</h2><p>Fair and simple is the way.</p></div></div>
          <div className="price-field-row"><label className="field-label">Price (₹)<input type="number" inputMode="numeric" name="price" min="0" step="1" required placeholder="0" data-testid="input-listing-price" /></label>{kind === 'rent' && <label className="field-label">Price cadence<select name="priceUnit" defaultValue="week" data-testid="select-price-unit"><option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option></select></label>}</div>
          {kind === 'rent' && <div className="two-fields"><label className="field-label">Available from<input type="date" name="availableFrom" data-testid="input-available-from" /></label><label className="field-label">Available until<input type="date" name="availableUntil" data-testid="input-available-until" /></label></div>}
        </section>

        <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Show it off</h2><p>Photos and videos help the right person find it faster.</p></div></div>
          <input ref={fileRef} type="file" accept={ACCEPT_MEDIA} multiple className="visually-hidden" onChange={e => void uploadFiles(e.target.files)} data-testid="input-listing-media" />
          <button type="button" className="upload-drop" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="button-upload-media"><span className="upload-icon"><Upload size={22} /></span><b>{uploading ? 'Uploading media…' : 'Add photos or video'}</b><span>Choose media files from your device</span><small>Photos: JPG, JPEG, PNG, WebP, GIF, BMP, AVIF. Videos: MP4, MOV, WebM. Up to 50 MB each.</small></button>
          {(uploads.length > 0 || pending.length > 0) && (
            <div className="upload-previews">
              {uploads.map((url, i) => (
                <div key={url}>
                  {isVideoUrl(url) ? (
                    <><video src={url} muted playsInline preload="metadata" className="w-full h-full object-cover rounded-[9px] bg-black" /><span className="absolute inset-0 grid place-items-center text-white pointer-events-none"><Play size={18} fill="currentColor" /></span></>
                  ) : (
                    <img src={url} alt={`Listing upload ${i + 1}`} />
                  )}
                  <button type="button" onClick={() => setUploads(current => current.filter(x => x !== url))} aria-label="Remove media" data-testid={`button-remove-media-${i}`}><X size={14} /></button>
                </div>
              ))}
              {pending.map(p => (
                <div key={p.id} className="rounded-[9px] bg-[#f0ede4] border border-[#e6e2d8] flex flex-col items-center justify-center gap-1.5 px-1.5" title={p.name}>
                  <span className="text-[14px] font-bold text-[#285f51]">{p.progress}%</span>
                  <span className="block w-full h-1.5 rounded-full bg-[#d9ded5] overflow-hidden"><span className="block h-full bg-[#285f51] transition-all" style={{ width: `${p.progress}%` }} /></span>
                </div>
              ))}
            </div>
          )}
          {uploadError && <p className="inline-warning" role="status">{uploadError}</p>}
        </section>

        <section className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Where and when can you hand it over?</h2><p>Enter meeting place in detail so the buyer can find you easily.</p></div></div>
          <label className="field-label">Meeting place<input value={place} onChange={e => { setPlace(e.target.value); fail('place', ''); }} maxLength={160} placeholder="e.g. North hostel lobby, near the main gate" data-testid="input-listing-location" /><Err k="place" /></label>
          <div className="two-fields">
            <label className="field-label">House / building no.<input value={house} onChange={e => setHouse(e.target.value)} maxLength={120} placeholder="e.g. Block B, Room 12" /></label>
            <label className="field-label">Street / area<input value={street} onChange={e => setStreet(e.target.value)} maxLength={160} placeholder="e.g. Sector 4, Main Road" /></label>
          </div>
          <label className="field-label">Nearest landmark <span className="optional-label">optional</span><input value={landmark} onChange={e => setLandmark(e.target.value)} maxLength={160} placeholder="e.g. Opposite the canteen" /></label>
          <div className="two-fields pair">
            <label className="field-label">City<input value={city} onChange={e => setCity(e.target.value)} maxLength={80} placeholder="e.g. New Delhi" /></label>
            <label className="field-label">Pincode<input value={pincode} onChange={e => { setPincode(e.target.value.replace(/\D/g, '').slice(0, 6)); fail('pincode', ''); }} inputMode="numeric" maxLength={6} placeholder="6 digits" /><Err k="pincode" /></label>
          </div>
          <div className="field-label">Time you are free to hand it over<Err k="time" />
            <div className="two-fields time-fields pair">
              <label>From<input type="time" value={timeFrom} onChange={e => { setTimeFrom(e.target.value); fail('time', ''); }} /></label>
              <label>To<input type="time" value={timeTo} onChange={e => { setTimeTo(e.target.value); fail('time', ''); }} /></label>
            </div>
          </div>
          <div className="field-label">Photo of the meeting place <span className="optional-label">optional</span>
            <input ref={meetupRef} type="file" accept={ACCEPT_PHOTO} className="visually-hidden" onChange={e => void uploadMeetupPhoto(e.target.files)} />
            {meetupPhoto ? (
              <div className="meetup-photo"><img src={meetupPhoto} alt="Meeting place" /><button type="button" onClick={() => setMeetupPhoto('')} aria-label="Remove meeting place photo"><X size={15} /> Remove</button></div>
            ) : (
              <button type="button" className="meetup-add" onClick={() => meetupRef.current?.click()} disabled={meetupBusy}><Upload size={18} /> {meetupBusy ? 'Uploading…' : 'Add a photo of the spot'}</button>
            )}
            <Err k="meetupPhoto" />
          </div>
        </section>

        <section className="form-section"><div className="form-section-heading"><span>05</span><div><h2>How can they reach you?</h2><p>Your name, photo and email come from your profile, so they always match.</p></div></div>
          <div className="profile-preview">
            <SellerAvatar name={user?.fullName || 'S'} imageUrl={user?.hasImage ? user.imageUrl : null} className="seller-avatar" />
            <span><b>{user?.fullName || 'Your name'}</b><small>{user?.primaryEmailAddress?.emailAddress}</small></span>
            <Link href="/account" className="profile-edit">Edit profile</Link>
          </div>
          <label className="field-label">Phone number<input type="tel" inputMode="tel" value={phone} onChange={e => { setPhone(e.target.value); fail('phone', ''); }} maxLength={20} placeholder="+91 98765 43210" data-testid="input-seller-phone" /><small className="form-help">10 to 15 digits. Saved to your profile.</small><Err k="phone" /></label>
        </section>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        <div className="submit-row"><span><ShieldCheck size={16} /> Only share what you’re comfortable sharing.</span><button className="button button-primary button-large" disabled={create.isPending || uploading || meetupBusy} data-testid="button-publish-listing">{create.isPending ? 'Publishing…' : 'Publish listing'}<ArrowRight size={17} /></button></div>
      </form>}
  </AppPage>;
}

function Dashboard() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: listings, isLoading, isError, error, refetch } = useGetMyListings();
  const update = useUpdateListing();
  const remove = useDeleteListing();
  const invalidate = useInvalidateMarketplace();
  const [feedback, setFeedback] = useState('');
  const changeStatus = (item: Listing, status: ListingStatus) => {
    update.mutate({ id: item.id, data: { status } }, { onSuccess: () => { setFeedback(`Marked “${item.title}” ${statusLabels[status].toLowerCase()}.`); invalidate(); }, onError: () => setFeedback('Status couldn’t be updated. Try again.') });
  };
  const deleteItem = (item: Listing) => {
    if (!window.confirm(`Remove “${item.title}” from your listings? This cannot be undone.`)) return;
    remove.mutate({ id: item.id }, { onSuccess: () => { setFeedback('Listing removed.'); invalidate(); }, onError: () => setFeedback('Could not remove listing. Try again.') });
  };
  return <AppPage><div className="dashboard-heading"><div><span className="eyebrow">YOUR LITTLE CORNER OF CAMPUS</span><h1>Good to see you <em>back.</em></h1><p>Keep track of what you’ve put into circulation.</p></div><Link href="/sell" className="button button-primary" data-testid="link-create-listing"><Plus size={17} /> List an item</Link></div>
    {summaryError ? <ErrorState retry={() => void refetchSummary()} error={summaryErr} /> : <div className="stats-row">{summaryLoading ? [0, 1, 2, 3].map(i => <div className="stat-card shimmer" key={i}></div>) : [
      { label: 'Active listings', value: summary?.activeListings ?? 0, Icon: PackageCheck },
      { label: 'Completed', value: summary?.completedListings ?? 0, Icon: Check },
      { label: 'Saved finds', value: summary?.favorites ?? 0, Icon: Heart },
      { label: 'New inquiries', value: summary?.newInquiries ?? 0, Icon: Inbox },
    ].map(({ label, value, Icon }) => <div className="stat-card" key={label}><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><b>{value}</b></div>)}</div>}
    <div className="dashboard-listings-head"><div><span className="eyebrow">THE THINGS YOU'VE LISTED</span><h2>Your listings</h2></div><span className="count-label">{listings?.length || 0} total</span></div>
    {feedback && <div className={`feedback-banner ${feedback.includes('could') || feedback.includes('Could') ? 'feedback-error' : ''}`} role="status"><Check size={16} />{feedback}<button onClick={() => setFeedback('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {isLoading ? <ListingSkeleton /> : isError ? <ErrorState retry={() => void refetch()} error={error} /> : Array.isArray(listings) && listings.length ? (
      <div className="management-list">
        {listings.map(item => (
          <div className="management-row" key={item.id} data-testid={`row-my-listing-${item.id}`}>
            <Link href={`/listing/${item.id}`} className="management-thumb">
              <CoverMedia item={item} />
            </Link>
            <div className="management-main"><span className="card-meta">{item.category} · {item.listingType === 'rent' ? 'Rental' : 'Sale'}</span><Link href={`/listing/${item.id}`} className="management-title">{item.title}</Link><span className={`status-chip ${item.status}`}>{statusLabels[item.status]}</span></div><strong className="management-price">{currency(item.price)}{item.listingType === 'rent' ? ` / ${item.priceUnit}` : ''}</strong><label className="status-select-label"><span>Status</span><select aria-label={`Change status for ${item.title}`} value={item.status} onChange={e => changeStatus(item, e.target.value as ListingStatus)} data-testid={`select-status-${item.id}`}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="rented">Rented</option></select></label><button className="icon-button delete-button" onClick={() => deleteItem(item)} aria-label={`Delete ${item.title}`} disabled={remove.isPending} data-testid={`button-delete-${item.id}`}><Trash2 size={17} /></button></div>))}</div> ) : ( <EmptyState title="Your shelf is still empty." body="List a book, a cycle, or something someone else will be glad to find." action={<Link href="/sell" className="button button-primary" data-testid="link-first-listing"><Plus size={16} /> Create your first listing</Link>} />)}
  </AppPage>;
}

function SavedPage() {
  const { data: favorites, isLoading, isError, error, refetch } = useGetFavorites();
  const rows = Array.isArray(favorites) ? favorites : [];
  return <AppPage><div className="page-heading"><span className="eyebrow">A LITTLE SOMETHING FOR LATER</span><h1>Your saved <em>finds.</em></h1><p>Keep the good ones close while you decide.</p></div>{isLoading ? <ListingSkeleton /> : isError ? <ErrorState retry={() => void refetch()} error={error} /> : rows.length ? <div className="listing-grid">{rows.map((item, i) => <ListingCard key={item.id} item={item} index={i} />)}</div> : <EmptyState title="Nothing tucked away yet." body="Tap the heart on anything you like. It’ll be waiting here." action={<Link href="/" className="button button-primary" data-testid="link-find-items">Explore the marketplace <ArrowRight size={16} /></Link>} />}</AppPage>;
}

function InboxPage() {
  const { user } = useUser();
  const { data: inquiries, isLoading, isError, error, refetch } = useGetInquiries({
    query: {
      queryKey: getGetInquiriesQueryKey(),
      refetchInterval: 10000 // Poll every 10 seconds for real-time updates
    }
  });
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const rows = Array.isArray(inquiries) ? inquiries : [];

  const threads = useMemo(() => {
    const groups: Record<string, any[]> = {};
    rows.forEach(iq => {
      const otherId = iq.senderId === user?.id ? iq.recipientId : iq.senderId;
      const key = `${iq.listingId}-${otherId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(iq);
    });
    return Object.entries(groups).map(([key, msgs]) => {
      const last = msgs[0];
      const isSender = last.senderId === user?.id;
      const otherId = isSender ? last.recipientId : last.senderId;
      const fromOther = msgs.find(m => m.senderId === otherId);
      const otherName = fromOther?.senderName || (last.sellerId === otherId ? last.sellerName : 'Student');
      const otherImage = fromOther?.senderImageUrl ?? null;
      const unread = msgs.filter(m => m.isUnread).length;
      return { key, last, msgs, otherId, otherName, otherImage, unread, listingId: last.listingId, listingTitle: last.listingTitle, listingImage: last.listingImage };
    }).sort((a, b) => new Date(b.last.createdAt).getTime() - new Date(a.last.createdAt).getTime());
  }, [rows, user?.id]);

  if (selectedThread) {
    const thread = threads.find(t => t.key === selectedThread);
    if (thread) return <ChatView thread={thread} onBack={() => setSelectedThread(null)} />;
  }

  return (
    <AppPage>
      <div className="page-heading">
        <span className="eyebrow">THE CONVERSATION STARTS HERE</span>
        <h1>Your <em>inbox.</em></h1>
        <p>Questions and messages about campus finds.</p>
      </div>
      {isLoading && !rows.length ? (
        <div className="inquiry-skeletons">{[0, 1, 2].map(i => <div className="inquiry-skeleton shimmer" key={i}></div>)}</div>
      ) : isError ? (
        <ErrorState retry={() => void refetch()} error={error} />
      ) : threads.length ? (
        <div className="divide-y divide-[#e6e2d8] bg-[#fffdf8] rounded-2xl border border-[#e6e2d8] overflow-hidden">
          {threads.map((thread) => (
            <button
              key={thread.key}
              onClick={() => setSelectedThread(thread.key)}
              className="w-full text-left p-4 hover:bg-[#fbfaf5] transition-colors flex gap-4 items-center"
            >
              <SellerAvatar name={thread.otherName} imageUrl={thread.otherImage} className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#f7f4eb] text-[#285f51] font-bold text-lg border border-[#e6e2d8] overflow-hidden flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`truncate ${thread.unread ? 'font-extrabold' : 'font-bold'} text-[#213b34]`}>{thread.otherName}</h3>
                  <time className="text-[11px] text-[#65766e] uppercase tracking-wider">{new Date(thread.last.createdAt).toLocaleDateString()}</time>
                </div>
                <div className="text-xs font-medium text-[#285f51] mb-1 truncate">{thread.listingTitle}</div>
                <p className={`text-sm line-clamp-1 ${thread.unread ? 'text-[#213b34] font-semibold' : 'text-[#65766e]'}`}>{thread.last.message}</p>
              </div>
              {thread.unread > 0 ? <UnreadBadge count={thread.unread} cap={99} label="unread messages" /> : <ArrowRight size={16} className="text-[#d9ded5]" />}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Quiet in here so far."
          body="When someone asks about one of your listings, their note will land here."
          action={<Link href="/dashboard" className="button button-secondary">See your listings <ArrowRight size={16} /></Link>}
        />
      )}
    </AppPage>
  );
}


function CartPage() {
  const { user } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [repeatOrder, setRepeatOrder] = useState<Listing | null>(null);
  const [totals, setTotals] = useState<Record<number, number>>({});

  useEffect(() => {
    setLoading(true); setLoadError(null);
    customFetch('/api/cart')
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch(error => setLoadError(error))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const createOrder = async (listing: Listing) => {
    try {
      await customFetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, location: listing.meetup?.place || listing.location }),
      });
      toast({ title: 'Order placed', description: listing.title });
      setLocation('/orders');
    } catch (err) {
      toast({ variant: 'destructive', title: friendlyError(err, 'Couldn’t place the order') });
    }
  };

  // Starting an order for something you already ordered asks first.
  const beginOrder = async (listing: Listing) => {
    try {
      const existing: any = await customFetch('/api/tracking');
      const mine = Array.isArray(existing) ? existing.filter(t => t.listingId === listing.id && t.buyerId === user?.id) : [];
      if (mine.length > 0) { setRepeatOrder(listing); return; }
    } catch { /* if the check fails, just place the order */ }
    await createOrder(listing);
  };

  const removeItem = (item: any) => {
    customFetch(`/api/cart/${item.id}`, { method: 'DELETE' })
      .then(() => { setItems(prev => prev.filter(i => i.id !== item.id)); toast({ title: 'Removed from cart' }); })
      .catch(err => toast({ variant: 'destructive', title: friendlyError(err, 'Couldn’t remove that item') }));
  };

  const total = items.reduce((sum, item) => sum + (totals[item.listingId] ?? 0), 0);

  return (
    <AppPage>
      <div className="page-heading">
        <span className="eyebrow">YOUR CAMPUS HAUL</span>
        <h1>Your <em>cart.</em></h1>
        <p>Items you’re ready to pick up.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-[#f7f4eb] rounded-2xl" />)}</div>
      ) : loadError ? (
        <ErrorState retry={() => setReloadKey(k => k + 1)} error={loadError} />
      ) : items.length > 0 ? (
        <div className="cart-list">
          {items.map(item => (
            <CartItemRow key={item.id} item={item} onRemove={() => removeItem(item)} onOrder={beginOrder} onPrice={price => setTotals(t => (t[item.listingId] === price ? t : { ...t, [item.listingId]: price }))} />
          ))}
          <div className="cart-total"><span>{items.length} {items.length === 1 ? 'item' : 'items'}</span><b>Total {currency(total)}</b></div>
          <p className="cart-hint"><PackageCheck size={16} /><span>Tap <b>Place order</b> to arrange the hand-off with the seller.</span></p>
        </div>
      ) : (
        <EmptyState
          title="Your cart is empty."
          body="Find something useful on the shelves and add it here."
          action={<Link href="/" className="button button-primary">Browse marketplace</Link>}
        />
      )}
      <ConfirmDialog open={Boolean(repeatOrder)} title="You’ve done this before" icon={<PackageCheck size={24} />} confirmLabel="Yes, order again" cancelLabel="No"
        onCancel={() => setRepeatOrder(null)} onConfirm={() => { const l = repeatOrder; setRepeatOrder(null); if (l) void createOrder(l); }}>
        You already placed an order for “{repeatOrder?.title}”. Do you want to place it again? A new card will be added to My orders.
      </ConfirmDialog>
    </AppPage>
  );
}

function CartItemRow({ item, onRemove, onOrder, onPrice }: { item: any; onRemove: () => void; onOrder: (listing: Listing) => void; onPrice: (price: number) => void }) {
  const { data: listing, isLoading } = useGetListing(item.listingId);
  useEffect(() => { if (listing) onPrice(listing.price); }, [listing, onPrice]);

  if (isLoading) return <div className="h-32 bg-[#f7f4eb] rounded-2xl animate-pulse" />;
  if (!listing) return null;
  const place = listing.meetup?.place || listing.location;
  const time = formatTimeRange(listing.meetup?.timeFrom, listing.meetup?.timeTo);

  return (
    <article className="cart-item">
      <Link href={`/listing/${listing.id}`} className="cart-thumb photo-frame"><CoverMedia item={listing} /></Link>
      <div className="cart-info">
        <Link href={`/listing/${listing.id}`} className="cart-title">{listing.title}</Link>
        <b className="cart-price">{currency(listing.price)}{listing.listingType === 'rent' ? ` / ${listing.priceUnit}` : ''}</b>
        <span className="cart-sub"><SellerAvatar name={listing.sellerName} imageUrl={listing.sellerImageUrl} />{listing.sellerName}</span>
        <span className="cart-sub"><MapPin size={14} />{place}{time ? ` · ${time}` : ''}</span>
      </div>
      <div className="cart-actions">
        <button onClick={() => onOrder(listing)} className="button button-primary button-small"><PackageCheck size={17} /> Place order</button>
        <button onClick={onRemove} className="button button-quiet button-small cart-remove" aria-label="Remove from cart"><Trash2 size={17} /> Remove</button>
      </div>
    </article>
  );
}

function OrderMeta({ t }: { t: any }) {
  const { data: listing } = useGetListing(t.listingId, { query: { retry: 0 } as any });
  const m = listing?.meetup ?? {};
  const place = t.location || m.place || listing?.location || 'Meeting place to be decided';
  const cityLine = [m.city, m.pincode].filter(Boolean).join(' – ');
  const address = [m.house, m.street, m.landmark || '', cityLine].filter(Boolean).join(', ');
  const window = formatTimeRange(m.timeFrom, m.timeTo);
  return (
    <div className="space-y-3 mb-6 order-meta">
      <div><MapPin size={18} /><span><b>{place}</b>{address && <small>{address}</small>}</span></div>
      <div><Clock3 size={18} /><span><b>{t.scheduledTime ? new Date(t.scheduledTime).toLocaleString() : window ? `Hand-over time: ${window}` : 'Time to be decided'}</b>{t.scheduledTime && window && <small>Seller is free {window}</small>}</span></div>
      <div className="order-placed"><small>Order placed {new Date(t.createdAt).toLocaleString()}</small></div>
    </div>
  );
}

function TrackingTitle({ listingId }: { listingId: number }) {
  const { data } = useGetListing(listingId, { query: { retry: 0 } as any });
  return (
    <Link href={`/listing/${listingId}`} className="font-bold text-lg text-[#213b34] hover:underline">
      {data?.title ?? `Listing #${listingId}`}
    </Link>
  );
}

function TrackingPage() {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    setLoading(true); setLoadError(null);
    customFetch('/api/tracking')
      .then((data: any) => setTrackings(Array.isArray(data) ? data : []))
      .catch(error => setLoadError(error))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await customFetch(`/api/tracking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setTrackings(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <AppPage>
      <div className="page-heading">
        <span className="eyebrow">KEEPING IT MOVING</span>
        <h1>My <em>orders.</em></h1>
        <p>Track your meet-ups and item hand-overs.</p>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-[#f7f4eb] rounded-2xl" />)}
        </div>
      ) : loadError ? (
        <ErrorState retry={() => setReloadKey(k => k + 1)} error={loadError} />
      ) : trackings.length > 0 ? (
        <div className="space-y-6">
          {trackings.map(t => (
            <div key={t.id} className="bg-white border border-[#e6e2d8] p-6 rounded-3xl shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block ${
                    t.status === 'completed' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef9c3] text-[#854d0e]'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-xs font-semibold text-[#65766e]">You are the {t.sellerId === user?.id ? 'seller' : 'buyer'}</span>
                </div>
                <TrackingTitle listingId={t.listingId} />
              </div>

              <OrderMeta t={t} />

              <div className="flex gap-2">
                {t.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(t.id, 'scheduled')}
                      className="button button-primary button-small flex-1"
                    >
                      Confirm Meet
                    </button>
                    <button
                      onClick={() => updateStatus(t.id, 'cancelled')}
                      className="button button-quiet button-small flex-1"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {t.status === 'scheduled' && (
                  <button
                    onClick={() => updateStatus(t.id, 'completed')}
                    className="button button-primary button-small w-full"
                  >
                    Mark Handed Over
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No hand-offs in progress."
          body="Start a hand-off from your cart or respond to an inquiry."
          action={<Link href="/cart" className="button button-primary">Go to Cart</Link>}
        />
      )}
    </AppPage>
  );
}

function ChatView({ thread, onBack }: { thread: any; onBack: () => void }) {
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const createInquiry = useCreateInquiry();
  const invalidate = useInvalidateMarketplace();
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.msgs.length]);

  // Opening a conversation (or receiving a message while it is open) marks it as read.
  useEffect(() => {
    if (!thread.unread) return;
    void customFetch('/api/inbox/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: thread.listingId, otherId: thread.otherId }) })
      .then(() => Promise.all([qc.invalidateQueries({ queryKey: unreadKey }), qc.invalidateQueries({ queryKey: getGetInquiriesQueryKey() })]))
      .catch(() => undefined);
  }, [thread.unread, thread.listingId, thread.otherId, qc]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || createInquiry.isPending) return;
    createInquiry.mutate({
      id: thread.listingId,
      data: {
        senderName: user?.fullName || user?.firstName || 'Student',
        message: message.trim(),
        recipientId: thread.otherId
      }
    }, {
      onSuccess: () => {
        setMessage('');
        invalidate();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-[#fffdf8] z-[60] flex flex-col md:relative md:inset-auto md:h-[600px] md:rounded-2xl md:border md:border-[#e6e2d8] md:shadow-xl md:my-8">
      <div className="p-4 border-b border-[#e6e2d8] flex items-center gap-3 bg-[#fffdf8]/80 backdrop-blur-md sticky top-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-[#f7f4eb] rounded-full transition-colors"><ArrowLeft size={20} /></button>
        <SellerAvatar name={thread.otherName} imageUrl={thread.otherImage} className="inline-grid place-items-center w-10 h-10 rounded-full bg-[#f7f4eb] text-[#285f51] font-bold border border-[#e6e2d8] overflow-hidden" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#213b34] truncate">{thread.otherName}</h3>
          <Link href={`/listing/${thread.listingId}`} className="text-xs text-[#285f51] font-medium hover:underline truncate block">Re: {thread.listingTitle}</Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {[...thread.msgs].reverse().map((msg: any) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                isMe ? 'bg-[#285f51] text-white rounded-tr-none' : 'bg-[#f7f4eb] text-[#213b34] rounded-tl-none border border-[#e6e2d8]'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <time className={`text-[10px] mt-1 block uppercase tracking-wider ${isMe ? 'text-white/60' : 'text-[#65766e]'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={onSend} className="p-4 border-t border-[#e6e2d8] bg-[#fffdf8] flex gap-2 pb-safe">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 bg-[#f7f4eb] border border-[#e6e2d8] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#285f51]/20"
          autoFocus
        />
        <button
          type="submit"
          disabled={!message.trim() || createInquiry.isPending}
          className="w-10 h-10 rounded-xl bg-[#285f51] text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
        >
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
}

function SignInPage() {
  return <div className="auth-layout"><div className="auth-story"><Brand /><div className="auth-story-copy"><span className="eyebrow">YOUR CAMPUS, IN CIRCULATION</span><h1>Good things<br />find <em>good people.</em></h1><p>Pick up what you need. Pass along what you don’t. That’s campus life, made a little easier.</p><div className="auth-stamp"><Sparkles size={17} /> Keep useful things moving</div></div><span className="auth-footnote">A student marketplace, close to home.</span></div><div className="auth-form-side"><GoogleBrowserButton /><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /><p className="auth-legal">By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p><Link href="/" className="auth-home-link" data-testid="link-auth-home"><ArrowLeft size={15} /> Back to marketplace</Link></div></div>;
}

function SignUpPage() {
  return <div className="auth-layout"><div className="auth-story"><Brand /><div className="auth-story-copy"><span className="eyebrow">MAKE ROOM FOR THE NEXT THING</span><h1>Start with<br />what's <em>already here.</em></h1><p>Join students making good finds more affordable, and campus a little less wasteful.</p><div className="auth-stamp"><ShieldCheck size={17} /> Just your campus community</div></div><span className="auth-footnote">A student marketplace, close to home.</span></div><div className="auth-form-side"><GoogleBrowserButton label="Sign up with Google" /><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /><p className="auth-legal">By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p><Link href="/" className="auth-home-link" data-testid="link-auth-home"><ArrowLeft size={15} /> Back to marketplace</Link></div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function ListingRoute({ params }: { params: { id?: string } }) {
  return <ListingDetail id={Number(params.id)} />;
}

function SellerProfilePage({ id }: { id: string }) {
  const { user } = useUser();
  const seller = useQuery({ queryKey: ['seller', id], queryFn: () => customFetch<any>(`/api/sellers/${encodeURIComponent(id)}`), retry: 1 });
  if (seller.isLoading) return <AppPage><div className="animate-pulse space-y-4"><div className="h-40 bg-[#f7f4eb] rounded-3xl" /><div className="h-24 bg-[#f7f4eb] rounded-2xl" /></div></AppPage>;
  if (seller.isError || !seller.data) return <AppPage><ErrorState retry={() => void seller.refetch()} error={seller.error} /></AppPage>;
  const profile = seller.data;
  const listings: Listing[] = Array.isArray(profile.listings) ? profile.listings : [];
  const isMe = user?.id === profile.id;
  return (
    <AppPage>
      <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to the shelves</Link>
      <div className="max-w-[760px] mx-auto">
        <section className="seller-hero">
          <SellerAvatar name={profile.name} imageUrl={profile.imageUrl} className="seller-hero-avatar" />
          <h1>{profile.name}</h1>
          <p>Campus community member{profile.listingCount ? ` · ${profile.listingCount} ${profile.listingCount === 1 ? 'listing' : 'listings'}` : ''}</p>
          {isMe && <Link href="/account" className="button button-secondary button-small">Edit my profile</Link>}
        </section>
        <section className="seller-contact">
          <h2>Contact details</h2>
          {profile.phone ? <a href={`tel:${profile.phone}`}><MessageCircle size={19} /><span><small>Phone</small><b>{profile.phone}</b></span></a> : null}
          {profile.email ? <a href={`mailto:${profile.email}`}><Inbox size={19} /><span><small>Email</small><b>{profile.email}</b></span></a> : null}
          {!profile.phone && !profile.email && <p className="text-[#65766e]">This student hasn’t shared contact details yet. You can still message them from any of their listings.</p>}
        </section>
        <div className="dashboard-listings-head"><h2>Listed by {profile.name.split(' ')[0]}</h2><span>{listings.length} available</span></div>
        {listings.length > 0 ? (
          <div className="listing-grid">{listings.map((item, index) => <ListingCard key={item.id} item={item} index={index} />)}</div>
        ) : (
          <EmptyState title="Nothing on the shelf right now." body="This student has no active listings at the moment." />
        )}
      </div>
    </AppPage>
  );
}

function Router() {
  return <RoutedErrorBoundary><NavigationEffects /><Switch>
    <Route path="/" component={Home} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/listing/:id" component={ListingRoute} />
    <Route path="/sell">{() => <Protected><SellPage /></Protected>}</Route>
    <Route path="/dashboard">{() => <Protected><Dashboard /></Protected>}</Route>
    <Route path="/profile">{() => <Protected><ProfilePage /></Protected>}</Route>
    <Route path="/account/*?">{() => <Protected><AccountPage /></Protected>}</Route>
    <Route path="/orders">{() => <Protected><TrackingPage /></Protected>}</Route>
    <Route path="/help" component={HelpPage} />
    <Route path="/privacy" component={PrivacyPage} />
    <Route path="/notifications">{() => <Protected><NotificationsPage /></Protected>}</Route>
    <Route path="/seller/:id">{params => <SellerProfilePage id={decodeURIComponent(params.id)} />}</Route>
    <Route path="/terms" component={TermsPage} />
    <Route path="/saved">{() => <Protected><SavedPage /></Protected>}</Route>
    <Route path="/inbox">{() => <Protected><InboxPage /></Protected>}</Route>
    <Route path="/cart">{() => <Protected><CartPage /></Protected>}</Route>
    <Route path="/tracking">{() => <Protected><TrackingPage /></Protected>}</Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function ClerkLoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 9000); return () => clearTimeout(t); }, []);
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fffdf8] px-6">
      <div className="text-center max-w-sm">
        <Brand />
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#285f51] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#65766e] font-medium text-[18px]">Getting things ready…</p>
          {slow && (
            <div className="space-y-3">
              <p className="text-[16px] text-[#65766e] leading-relaxed">This is taking longer than usual. Check that your internet is on, then try again.</p>
              <button className="button button-primary" onClick={() => window.location.reload()}>Try again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  // Every launch starts from the loading screen for a moment, then Explore.
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSplashDone(true), 900); return () => clearTimeout(t); }, []);
  const isCapacitor = !!(window as any).Capacitor;
  const isMobile = window.location.hostname === 'localhost' || window.location.protocol === 'capacitor:';

  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={isMobile ? undefined : clerkProxyUrl}
    appearance={appearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back to campuscrate', subtitle: 'Your next useful find is waiting.' } },
      signUp: { start: { title: 'Make yourself at home', subtitle: 'A better way to find and pass things on.' } },
    }}
    routerPush={(to) => {
      const target = stripBase(to);
      setLocation(target);
    }}
    routerReplace={(to) => {
      const target = stripBase(to);
      setLocation(target, { replace: true });
    }}
  >
    <ClerkLoading><ClerkLoadingScreen /></ClerkLoading>
    <ClerkLoaded>
      {!splashDone ? <ClerkLoadingScreen /> : (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <NativeAuthBridge />
          <NotificationWatcher />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      )}
    </ClerkLoaded>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;
