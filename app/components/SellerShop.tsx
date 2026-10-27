'use client';

// app/components/SellerShop.tsx — an approved seller's own shop: add products, see orders, see earnings.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { notify } from '../../lib/notify';
import { COMMISSION, fmtMMK } from '../../lib/payments';
import {
Sheet,
ProductImage,
StatusPill,
cardStyle,
inputStyle,
PRODUCT_CATEGORIES,
type Product,
type Order,
} from './shopShared';
import { Plus, Camera, Loader2, Pencil, Trash2, Eye, EyeOff, Truck, Package, Wallet, Phone, MapPin } from 'lucide-react';

const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };
const ghostBtn: React.CSSProperties = { background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' };

/** Shrink a phone photo to max 1000px JPEG so uploads are fast and cheap. */
async function compressImage(file: File): Promise<Blob> {
const url = URL.createObjectURL(file);
try {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = url;
});
const max = 1000;
const scale = Math.min(1, max / Math.max(img.width, img.height));
const canvas = document.createElement('canvas');
canvas.width = Math.round(img.width * scale);
canvas.height = Math.round(img.height * scale);
canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not read photo'))), 'image/jpeg', 0.82));
} finally {
URL.revokeObjectURL(url);
}
}

/* ---------------- add / edit product ---------------- */
function ProductForm({
userId,
product,
onClose,
onSaved,
}: {
userId: string;
product: Product | null;
onClose: () => void;
onSaved: () => void;
}) {
const { t } = useLang();
const [name, setName] = useState(product?.name ?? '');
const [description, setDescription] = useState(product?.description ?? '');
const [category, setCategory] = useState(product?.category ?? 'Skincare');
const [price, setPrice] = useState(product ? String(product.price_mmk) : '');
const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
const [uploading, setUploading] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');
const fileRef = useRef<HTMLInputElement | null>(null);

const pickPhoto = async (file: File | undefined) => {
if (!file) return;
setUploading(true);
setError('');
try {
const blob = await compressImage(file);
const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
const { error: upErr } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
if (upErr) throw upErr;
const { data } = supabase.storage.from('product-images').getPublicUrl(path);
setImageUrl(data.publicUrl as string);
} catch (e) {
console.error('upload failed', e);
setError(t('Could not upload the photo. Try a different one.'));
} finally {
setUploading(false);
}
};

const save = async () => {
const priceNum = Math.round(Number(price.replace(/[^0-9]/g, '')));
if (!imageUrl) return setError(t('Add a photo of the product.'));
if (name.trim().length < 2) return setError(t('Add the product name.'));
if (description.trim().length < 10) return setError(t('Describe the product in at least 10 characters.'));
if (!priceNum || priceNum < 100) return setError(t('Add a price in MMK.'));
setSaving(true);
setError('');
const row = {
name: name.trim().slice(0, 80),
description: description.trim().slice(0, 1500),
category,
price_mmk: priceNum,
image_url: imageUrl,
};
const { error: err } = product
? await supabase.from('products').update(row).eq('id', product.id)
: await supabase.from('products').insert({ ...row, seller_id: userId, active: true });
setSaving(false);
if (err) {
console.error('save product failed', err);
setError(t('Could not save. Check your connection and try again.'));
return;
}
onSaved();
onClose();
};

const priceNum = Math.round(Number(price.replace(/[^0-9]/g, ''))) || 0;

return (
<Sheet onClose={onClose} title={product ? t('Edit product') : t('Add a product')}>
<div className="space-y-4">
<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />
<button
onClick={() => fileRef.current?.click()}
className="w-full aspect-square rounded-3xl overflow-hidden relative flex items-center justify-center"
style={{ ...cardStyle, borderStyle: imageUrl ? 'solid' : 'dashed' }}
>
{imageUrl ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={imageUrl} alt="" className="w-full h-full object-cover" />
) : (
<div className="text-center">
<Camera className="w-8 h-8 mx-auto mb-2 text-[rgb(var(--gold))]" />
<span className="text-sm text-[rgb(var(--muted-hover))]">{t('Add a photo')}</span>
</div>
)}
{uploading && (
<div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
<Loader2 className="w-6 h-6 animate-spin text-white" />
</div>
)}
{imageUrl && !uploading && (
<span className="absolute bottom-3 right-3 text-[11px] rounded-lg px-2.5 py-1" style={{ background: 'rgb(0 0 0 / 0.6)', color: '#fff' }}>
{t('Change photo')}
</span>
)}
</button>

<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Product name')}</label>
<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none" style={inputStyle} />
</div>

<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Description (what it is, size, how to use)')}</label>
<textarea
value={description}
onChange={e => setDescription(e.target.value)}
rows={5}
maxLength={1500}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none resize-none"
style={inputStyle}
/>
</div>

<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Category')}</label>
<div className="flex flex-wrap gap-2">
{PRODUCT_CATEGORIES.map(c => {
const active = category === c;
return (
<button
key={c}
type="button"
onClick={() => setCategory(c)}
className="text-[11px] rounded-full px-3.5 py-2"
style={{
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{t(c)}
</button>
);
})}
</div>
</div>

<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Price (MMK)')}</label>
<input
value={price}
onChange={e => setPrice(e.target.value)}
inputMode="numeric"
placeholder="25000"
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
{priceNum >= 100 && (
<p className="text-[11px] text-[rgb(var(--muted))] mt-1.5">
{t('You receive {amount} per sale (80%).', { amount: fmtMMK(priceNum * (1 - COMMISSION)) })}
</p>
)}
</div>

{error && <p className="text-xs text-[rgb(var(--err))]">{error}</p>}
<button
onClick={save}
disabled={saving || uploading}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={primaryBtn}
>
{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : product ? t('Save changes') : t('Put it on sale')}
</button>
</div>
</Sheet>
);
}

/* ---------------- the shop ---------------- */
export default function SellerShop({ userId, onClose }: { userId: string; onClose: () => void }) {
const { t } = useLang();
const [tab, setTab] = useState<'products' | 'orders' | 'earnings'>('products');
const [products, setProducts] = useState<Product[]>([]);
const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
const [editing, setEditing] = useState<Product | null | 'new'>(null);
const [busyId, setBusyId] = useState<string | null>(null);

const load = useCallback(async () => {
const [p, o] = await Promise.all([
supabase.from('products').select('*').eq('seller_id', userId).order('created_at', { ascending: false }),
supabase.from('orders').select('*').eq('seller_id', userId).order('created_at', { ascending: false }).limit(200),
]);
if (p.error) console.error(p.error);
if (o.error) console.error(o.error);
setProducts((p.data as Product[]) ?? []);
setOrders((o.data as Order[]) ?? []);
setLoading(false);
}, [userId]);

useEffect(() => {
load();
}, [load]);

const toggleActive = async (p: Product) => {
setBusyId(p.id);
await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
setBusyId(null);
load();
};

const remove = async (p: Product) => {
if (!confirm(t('Delete "{name}"? This cannot be undone.', { name: p.name }))) return;
setBusyId(p.id);
await supabase.from('products').delete().eq('id', p.id);
setBusyId(null);
load();
};

const shipped = async (o: Order) => {
setBusyId(o.id);
const { error } = await supabase.rpc('mark_order_shipped', { p_order: o.id });
if (error) console.error(error);
else notify('order_shipped', o.id);
setBusyId(null);
load();
};

const toShip = orders.filter(o => o.status === 'paid');
const sold = orders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'completed');
const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const monthSales = sold.filter(o => new Date(o.paid_at ?? o.created_at) >= startMonth).reduce((s, o) => s + o.total_mmk, 0);
const allSales = sold.reduce((s, o) => s + o.total_mmk, 0);
const owed = orders
.filter(o => (o.status === 'shipped' || o.status === 'completed') && o.payout_status === 'unpaid')
.reduce((s, o) => s + o.total_mmk * (1 - COMMISSION), 0);
const paidOut = orders.filter(o => o.payout_status === 'paid').reduce((s, o) => s + o.total_mmk * (1 - COMMISSION), 0);

const tabs = [
{ key: 'products' as const, label: t('Products'), badge: 0 },
{ key: 'orders' as const, label: t('Orders'), badge: toShip.length },
{ key: 'earnings' as const, label: t('Earnings'), badge: 0 },
];

return (
<>
<Sheet onClose={onClose} title={t('My Shop')}>
<div className="grid grid-cols-3 gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgb(var(--muted) / 0.1)' }}>
{tabs.map(x => (
<button
key={x.key}
onClick={() => setTab(x.key)}
className="relative py-2.5 rounded-xl text-[13px] transition-all"
style={tab === x.key ? { ...primaryBtn, fontWeight: 600 } : { color: 'rgb(var(--muted-hover))' }}
>
{x.label}
{x.badge > 0 && (
<span
className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
style={{ background: 'rgb(var(--err))', color: '#fff' }}
>
{x.badge}
</span>
)}
</button>
))}
</div>

{loading ? (
<div className="flex justify-center py-12">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : tab === 'products' ? (
<div className="space-y-3">
<button
onClick={() => setEditing('new')}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px]"
style={primaryBtn}
>
<Plus className="w-5 h-5" /> {t('Add a product')}
</button>
{products.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<Package className="w-7 h-7 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">{t('No products yet. Add your first one.')}</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-2 leading-relaxed">
{t('Clear photo, honest description, fair price. That is what sells.')}
</p>
</div>
) : (
products.map(p => (
<div key={p.id} className="rounded-2xl p-3 flex gap-3" style={{ ...cardStyle, opacity: p.active ? 1 : 0.6 }}>
<ProductImage src={p.image_url} alt={p.name} className="w-20 h-20 rounded-xl flex-shrink-0" />
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium truncate">{p.name}</p>
<p className="text-xs text-[rgb(var(--muted-hover))]">{fmtMMK(p.price_mmk)}</p>
<p className="text-[10px] mt-0.5" style={{ color: p.hidden_by_admin ? 'rgb(var(--err))' : 'rgb(var(--muted))' }}>
{p.hidden_by_admin ? t('Hidden by Potentia. Contact us.') : p.active ? t('On sale') : t('Paused')}
</p>
<div className="flex gap-2 mt-2">
<button onClick={() => setEditing(p)} className="w-9 h-9 rounded-lg flex items-center justify-center" style={ghostBtn} aria-label="Edit">
<Pencil className="w-4 h-4" />
</button>
<button
onClick={() => toggleActive(p)}
disabled={busyId === p.id}
className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[11px] disabled:opacity-50"
style={ghostBtn}
>
{p.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
{p.active ? t('Pause') : t('Put on sale')}
</button>
<button
onClick={() => remove(p)}
disabled={busyId === p.id}
className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-50"
style={{ background: 'rgb(var(--err) / 0.1)', color: 'rgb(var(--err))' }}
aria-label="Delete"
>
<Trash2 className="w-4 h-4" />
</button>
</div>
</div>
</div>
))
)}
</div>
) : tab === 'orders' ? (
<div className="space-y-3">
{orders.filter(o => o.status !== 'pending').length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<Truck className="w-7 h-7 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">{t('No orders yet.')}</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-2">{t('Orders show here once Potentia has confirmed the payment.')}</p>
</div>
) : (
orders
.filter(o => o.status !== 'pending')
.map(o => (
<div key={o.id} className="rounded-2xl p-4" style={o.status === 'paid' ? { ...cardStyle, border: '1px solid rgb(var(--gold) / 0.5)' } : cardStyle}>
<div className="flex items-start justify-between gap-3 mb-3">
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium">
{o.qty} × {o.product_name}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{new Date(o.paid_at ?? o.created_at).toLocaleDateString()} · {t('you get')} {fmtMMK(o.total_mmk * (1 - COMMISSION))}
</p>
</div>
<StatusPill status={o.status} />
</div>
{(o.status === 'paid' || o.status === 'shipped') && (
<div className="rounded-xl p-3 space-y-1.5 text-[12px] text-[rgb(var(--muted-hover))]" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<p className="font-medium text-[rgb(var(--gold))]">{o.buyer_name}</p>
<a href={`tel:${o.buyer_phone}`} className="flex items-center gap-2">
<Phone className="w-3.5 h-3.5 flex-shrink-0" /> {o.buyer_phone}
</a>
<p className="flex items-start gap-2 whitespace-pre-line">
<MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {o.buyer_address}
</p>
{o.note && <p className="text-[rgb(var(--muted))]">“{o.note}”</p>}
</div>
)}
{o.status === 'paid' && (
<button
onClick={() => shipped(o)}
disabled={busyId === o.id}
className="w-full mt-3 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
style={primaryBtn}
>
{busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} {t('I shipped it')}
</button>
)}
</div>
))
)}
</div>
) : (
<div className="space-y-3">
<div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.25)' }}>
<div className="flex items-center gap-2 mb-1">
<Wallet className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{t('Potentia owes you')}</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))]">{fmtMMK(owed)}</div>
<p className="text-[11px] text-[rgb(var(--muted))] mt-1">{t('For shipped orders. Paid out monthly.')}</p>
</div>
<div className="grid grid-cols-2 gap-3">
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('Sales this month')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{fmtMMK(monthSales)}</p>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('Already paid to you')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{fmtMMK(paidOut)}</p>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('All-time sales')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{fmtMMK(allSales)}</p>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('Orders')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{sold.length}</p>
</div>
</div>
<p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed px-1">
{t('You keep 80% of every sale. Potentia keeps 20% for payments, the app and bringing you buyers.')}
</p>
</div>
)}
</Sheet>

{editing && (
<ProductForm userId={userId} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
)}
</>
);
}

