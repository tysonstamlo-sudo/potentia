'use client';

// app/components/Marketplace.tsx — the real shop. Products come from approved sellers.
// Buyers pay Potentia (Myanmar or Thai bank), you confirm, the seller ships, you pay the seller 80%.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { notify } from '../../lib/notify';
import { BANKS, fmt, fmtMMK, mmkToThb, type Currency } from '../../lib/payments';
import { BankPicker, QrBox } from './PremiumModal';
import SellerModal from './SellerModal';
import SellerShop from './SellerShop';
import {
Sheet,
ProductImage,
StatusPill,
cardStyle,
inputStyle,
primaryBtn,
PRODUCT_CATEGORIES,
type Product,
type Order,
} from './shopShared';
import {
Search,
Store,
TrendingUp,
Minus,
Plus,
Loader2,
CheckCircle2,
Package,
ShoppingBag,
} from 'lucide-react';

const LS_KEY = 'potentia_buyer';
function loadBuyer() {
try {
return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as { name?: string; phone?: string; address?: string };
} catch {
return {};
}
}
function saveBuyer(v: { name: string; phone: string; address: string }) {
try {
localStorage.setItem(LS_KEY, JSON.stringify(v));
} catch {
/* ignore */
}
}

/* ---------------- product detail + checkout ---------------- */
function ProductSheet({ product, isMine, onClose, onOrdered }: { product: Product; isMine: boolean; onClose: () => void; onOrdered: () => void }) {
const { t } = useLang();
const [step, setStep] = useState<'view' | 'details' | 'pay' | 'done'>('view');
const [qty, setQty] = useState(1);
const saved = useMemo(loadBuyer, []);
const [name, setName] = useState(saved.name ?? '');
const [phone, setPhone] = useState(saved.phone ?? '');
const [address, setAddress] = useState(saved.address ?? '');
const [note, setNote] = useState('');
const [currency, setCurrency] = useState<Currency>('MMK');
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');

const total = product.price_mmk * qty;
const due = currency === 'THB' ? mmkToThb(total) : total;
const bank = BANKS.find(b => b.id === currency)!;

const toPay = () => {
if (name.trim().length < 2) return setError(t('Add your name.'));
if (phone.trim().length < 6) return setError(t('Add a phone number the seller can call.'));
if (address.trim().length < 8) return setError(t('Add your full delivery address.'));
setError('');
saveBuyer({ name: name.trim(), phone: phone.trim(), address: address.trim() });
setStep('pay');
};

const placeOrder = async () => {
if (busy) return;
setBusy(true);
setError('');
const { data, error: err } = await supabase.rpc('place_order', {
p_product: product.id,
p_qty: qty,
p_currency: currency,
p_name: name.trim(),
p_phone: phone.trim(),
p_address: address.trim(),
p_note: note.trim() || null,
});
setBusy(false);
if (err) {
console.error('place_order failed', err);
setError(err.message || t('Could not place the order. Please try again.'));
return;
}
if (typeof data === 'string') notify('order_placed', data);
setStep('done');
onOrdered();
};

return (
<Sheet onClose={onClose} title={step === 'view' ? product.shop_name || t('Product') : t('Checkout')}>
{step === 'view' && (
<div>
<div className="rounded-3xl overflow-hidden mb-5 aspect-square">
<ProductImage src={product.image_url} alt={product.name} className="w-full h-full" />
</div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t(product.category)}</span>
<h2 className="font-display text-2xl font-semibold text-[rgb(var(--gold))] mt-1 mb-1 leading-tight">{product.name}</h2>
<p className="text-xs text-[rgb(var(--muted))] mb-4 flex items-center gap-1.5">
<Store className="w-3.5 h-3.5" /> {product.shop_name}
</p>
<div className="flex items-baseline gap-2 mb-5">
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">{fmtMMK(product.price_mmk)}</span>
<span className="text-xs text-[rgb(var(--muted))]">≈ {fmt(mmkToThb(product.price_mmk), 'THB')}</span>
</div>
{product.description && (
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed whitespace-pre-line mb-6">{product.description}</p>
)}
<div className="rounded-xl p-4 mb-6 text-[12px] text-[rgb(var(--muted-hover))] leading-relaxed" style={cardStyle}>
🔒 {t('You pay Potentia, not the seller. The seller only gets paid after your order ships.')}
</div>
{isMine ? (
<p className="text-center text-sm text-[rgb(var(--muted))]">{t('This is your product.')}</p>
) : (
<>
<div className="flex items-center justify-between mb-4">
<span className="text-sm text-[rgb(var(--muted-hover))]">{t('Quantity')}</span>
<div className="flex items-center gap-3">
<button
onClick={() => setQty(q => Math.max(1, q - 1))}
className="w-9 h-9 rounded-xl flex items-center justify-center"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
aria-label="Less"
>
<Minus className="w-4 h-4 text-[rgb(var(--gold))]" />
</button>
<span className="font-display text-lg text-[rgb(var(--gold))] w-6 text-center">{qty}</span>
<button
onClick={() => setQty(q => Math.min(20, q + 1))}
className="w-9 h-9 rounded-xl flex items-center justify-center"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
aria-label="More"
>
<Plus className="w-4 h-4 text-[rgb(var(--gold))]" />
</button>
</div>
</div>
<button onClick={() => setStep('details')} className="w-full font-semibold py-4 rounded-2xl text-[15px]" style={primaryBtn}>
{t('Buy now')} · {fmtMMK(total)}
</button>
</>
)}
</div>
)}

{step === 'details' && (
<div className="space-y-4">
<div className="flex gap-3 items-center rounded-2xl p-3" style={cardStyle}>
<ProductImage src={product.image_url} alt={product.name} className="w-14 h-14 rounded-xl flex-shrink-0" />
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] truncate">{product.name}</p>
<p className="text-xs text-[rgb(var(--muted))]">
{qty} × {fmtMMK(product.price_mmk)}
</p>
</div>
</div>
<p className="text-sm text-[rgb(var(--muted-hover))]">{t('Where should we deliver it?')}</p>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Your name')}</label>
<input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none" style={inputStyle} />
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Phone (Viber / Telegram OK)')}</label>
<input
value={phone}
onChange={e => setPhone(e.target.value)}
inputMode="tel"
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Full delivery address')}</label>
<textarea
value={address}
onChange={e => setAddress(e.target.value)}
rows={3}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none resize-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Note for the seller (optional)')}</label>
<input value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none" style={inputStyle} />
</div>
{error && <p className="text-xs text-[rgb(var(--err))]">{error}</p>}
<button onClick={toPay} className="w-full font-semibold py-4 rounded-2xl text-[15px]" style={primaryBtn}>
{t('Continue to payment')}
</button>
<button onClick={() => setStep('view')} className="w-full text-xs text-[rgb(var(--muted))] py-2">
{t('Back')}
</button>
</div>
)}

{step === 'pay' && (
<div>
<span className="text-[11px] text-[rgb(var(--muted))] block mb-2">{t('Which bank will you pay from?')}</span>
<div className="mb-4">
<BankPicker value={currency} onChange={setCurrency} />
</div>
<div className="mb-4">
<QrBox src={bank.qr} />
</div>
<div className="rounded-2xl p-4 mb-5 text-center" style={cardStyle}>
<span className="text-[11px] text-[rgb(var(--muted))] block">{t('Amount to send')}</span>
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">{fmt(due, currency)}</span>
<span className="text-[11px] text-[rgb(var(--muted))] block mt-1">
{qty} × {product.name}
</span>
</div>
{error && <p className="text-xs text-[rgb(var(--err))] mb-3">{error}</p>}
<button
onClick={placeOrder}
disabled={busy}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={primaryBtn}
>
{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : t("I've Sent Payment")}
</button>
<p className="text-center text-[11px] text-[rgb(var(--muted))] mt-3 leading-relaxed">
{t('Only tap this after you have paid. We check every payment before the order is sent to the seller.')}
</p>
<button onClick={() => setStep('details')} className="w-full text-xs text-[rgb(var(--muted))] py-3">
{t('Back')}
</button>
</div>
)}

{step === 'done' && (
<div className="text-center pt-10">
<CheckCircle2 className="w-12 h-12 mx-auto mb-5 text-[rgb(var(--gold))]" />
<h2 className="font-display text-2xl font-semibold text-[rgb(var(--gold))] mb-2">{t('Order placed')}</h2>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed mb-8 max-w-xs mx-auto">
{t("We'll check your payment, then the seller ships it. You can follow it under My orders.")}
</p>
<button onClick={onClose} className="font-semibold py-3.5 px-10 rounded-2xl text-[14px]" style={primaryBtn}>
{t('Done')}
</button>
</div>
)}
</Sheet>
);
}

/* ---------------- buyer's orders ---------------- */
function MyOrders({ orders, onChanged }: { orders: Order[]; onChanged: () => void }) {
const { t } = useLang();
const [busyId, setBusyId] = useState<string | null>(null);
if (orders.length === 0) return null;

const received = async (o: Order) => {
setBusyId(o.id);
const { error } = await supabase.rpc('confirm_order_received', { p_order: o.id });
if (error) console.error(error);
setBusyId(null);
onChanged();
};

return (
<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Package className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t('My orders')}</span>
</div>
<div className="space-y-3">
{orders.slice(0, 10).map(o => (
<div key={o.id} className="flex gap-3 items-center">
<ProductImage src={o.image_url} alt={o.product_name} className="w-12 h-12 rounded-xl flex-shrink-0" />
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--muted-hover))] truncate">
{o.qty} × {o.product_name}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{fmt(o.amount_due, o.currency)} · {new Date(o.created_at).toLocaleDateString()}
</p>
</div>
{o.status === 'shipped' ? (
<button
onClick={() => received(o)}
disabled={busyId === o.id}
className="text-[11px] font-semibold rounded-xl px-3 py-2 disabled:opacity-50 whitespace-nowrap"
style={primaryBtn}
>
{t('Got it')}
</button>
) : (
<StatusPill status={o.status} />
)}
</div>
))}
</div>
</div>
);
}

/* ---------------- main ---------------- */
export default function Marketplace() {
const { t } = useLang();
const [userId, setUserId] = useState<string | null>(null);
const [products, setProducts] = useState<Product[]>([]);
const [orders, setOrders] = useState<Order[]>([]);
const [isSeller, setIsSeller] = useState(false);
const [loading, setLoading] = useState(true);
const [category, setCategory] = useState('All');
const [query, setQuery] = useState('');
const [open, setOpen] = useState<Product | null>(null);
const [showApply, setShowApply] = useState(false);
const [showShop, setShowShop] = useState(false);

const load = useCallback(async () => {
const {
data: { session },
} = await supabase.auth.getSession();
const uid = session?.user.id ?? null;
setUserId(uid);
const [p, o, s] = await Promise.all([
supabase
.from('products')
.select('id, seller_id, shop_name, name, description, category, price_mmk, image_url, active, created_at')
.eq('active', true)
.eq('hidden_by_admin', false)
.order('created_at', { ascending: false })
.limit(200),
uid
? supabase.from('orders').select('*').eq('buyer_id', uid).order('created_at', { ascending: false }).limit(20)
: Promise.resolve({ data: [], error: null }),
uid ? supabase.rpc('is_approved_seller', { uid }) : Promise.resolve({ data: false, error: null }),
]);
if (p.error) console.error('products', p.error);
setProducts((p.data as Product[]) ?? []);
setOrders(((o as { data: unknown }).data as Order[]) ?? []);
setIsSeller((s as { data: unknown }).data === true);
setLoading(false);
}, []);

useEffect(() => {
load();
}, [load]);

const shown = products.filter(p => {
if (category !== 'All' && p.category !== category) return false;
const q = query.trim().toLowerCase();
if (!q) return true;
return p.name.toLowerCase().includes(q) || p.shop_name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
});
const usedCategories = ['All', ...PRODUCT_CATEGORIES.filter(c => products.some(p => p.category === c))];

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<div className="flex items-start justify-between gap-3">
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{t('Provisions')}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{t('Marketplace')}</h2>
<p className="text-xs text-[rgb(var(--muted-hover))] mt-2 leading-relaxed">
{t('Products from approved sellers. You pay Potentia, so your money is safe until it ships.')}
</p>
</div>
{isSeller && (
<button
onClick={() => setShowShop(true)}
className="flex-shrink-0 flex items-center gap-1.5 font-semibold py-2.5 px-3.5 rounded-xl text-xs"
style={primaryBtn}
>
<Store className="w-4 h-4" /> {t('My Shop')}
</button>
)}
</div>
</div>

<MyOrders orders={orders} onChanged={load} />

{products.length > 0 && (
<>
<div className="relative">
<Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" />
<input
value={query}
onChange={e => setQuery(e.target.value)}
placeholder={t('Search products')}
className="w-full rounded-2xl pl-11 pr-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
{usedCategories.length > 2 && (
<div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
{usedCategories.map(cat => {
const active = category === cat;
return (
<button
key={cat}
onClick={() => setCategory(cat)}
className="text-[11px] tracking-wide uppercase whitespace-nowrap rounded-full px-4 py-2 transition-all"
style={{
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{t(cat)}
</button>
);
})}
</div>
)}
</>
)}

{loading ? (
<div className="flex justify-center py-12">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : products.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<ShoppingBag className="w-8 h-8 mx-auto mb-3 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-1">{t('No products yet')}</h3>
<p className="text-xs text-[rgb(var(--muted))] leading-relaxed max-w-xs mx-auto">
{t('The first sellers are setting up. Have something good to sell? Apply below.')}
</p>
</div>
) : shown.length === 0 ? (
<p className="text-center text-sm text-[rgb(var(--muted))] py-8">{t('Nothing matches your search.')}</p>
) : (
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
{shown.map(p => (
<button key={p.id} onClick={() => setOpen(p)} className="rounded-2xl overflow-hidden text-left" style={cardStyle}>
<div className="aspect-square overflow-hidden">
<ProductImage src={p.image_url} alt={p.name} className="w-full h-full" />
</div>
<div className="p-3">
<p className="text-[10px] text-[rgb(var(--muted))] truncate">{p.shop_name}</p>
<h4 className="text-[13px] text-[rgb(var(--muted-hover))] mb-1.5 line-clamp-2 leading-snug">{p.name}</h4>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))]">{fmtMMK(p.price_mmk)}</span>
</div>
</button>
))}
</div>
)}

{!isSeller && (
<div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={cardStyle}>
<div className="flex items-center gap-3">
<span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--gold) / 0.12)' }}>
<TrendingUp className="w-4 h-4 text-[rgb(var(--gold))]" />
</span>
<div>
<h3 className="text-sm text-[rgb(var(--gold))] font-medium">{t('Sell on Potentia')}</h3>
<p className="text-[11px] text-[rgb(var(--muted))]">{t('Reach people actively improving themselves')}</p>
</div>
</div>
<button onClick={() => setShowApply(true)} className="font-medium py-2 px-4 rounded-xl text-xs whitespace-nowrap" style={primaryBtn}>
{t('Become a Seller')}
</button>
</div>
)}

{open && <ProductSheet product={open} isMine={open.seller_id === userId} onClose={() => setOpen(null)} onOrdered={load} />}
{showApply && (
<SellerModal
onClose={() => {
setShowApply(false);
load();
}}
onOpenShop={() => {
setShowApply(false);
setShowShop(true);
}}
/>
)}
{showShop && userId && (
<SellerShop
userId={userId}
onClose={() => {
setShowShop(false);
load();
}}
/>
)}
</div>
);
}

