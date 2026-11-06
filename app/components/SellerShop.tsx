'use client';

// app/components/SellerShop.tsx — an approved seller's own shop.
// Products · Orders (confirm the buyer's payment, ship) · Payment (your bank + QR) · Bills (Potentia's 20%, monthly).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { notify } from '../../lib/notify';
import { BANKS, COMMISSION, fmt, fmtMMK, mmkToThb, type Currency } from '../../lib/payments';
import { useThbRate } from '../../lib/fx';
import { BankPicker, QrBox } from './PremiumModal';
import ProofUpload from './ProofUpload';
import {
Sheet,
ProductImage,
StatusPill,
cardStyle,
inputStyle,
PRODUCT_CATEGORIES,
monthLabel,
type Product,
type Order,
type SellerPay,
type SellerBill,
} from './shopShared';
import {
Plus,
Camera,
Loader2,
Pencil,
Trash2,
Eye,
EyeOff,
Truck,
Package,
Wallet,
Phone,
MapPin,
Check,
X,
QrCode,
ReceiptText,
AlertTriangle,
} from 'lucide-react';

const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };
const ghostBtn: React.CSSProperties = { background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' };

/** Shrink a phone photo to max 1000px JPEG so uploads are fast and cheap. */
async function compressImage(file: File, max = 1000): Promise<Blob> {
const url = URL.createObjectURL(file);
try {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = url;
});
const scale = Math.min(1, max / Math.max(img.width, img.height));
const canvas = document.createElement('canvas');
canvas.width = Math.round(img.width * scale);
canvas.height = Math.round(img.height * scale);
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not read photo'))), 'image/jpeg', 0.88));
} finally {
URL.revokeObjectURL(url);
}
}

/** Upload to the seller's own folder in the public product-images bucket. Returns the public URL. */
async function uploadPublic(userId: string, file: File, max = 1000): Promise<string> {
const blob = await compressImage(file, max);
const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
if (error) throw error;
return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl as string;
}

function useL() {
const { t, lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
return { t, L };
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
const { t, L } = useL();
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
setImageUrl(await uploadPublic(userId, file));
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
{L(
`Buyers pay you ${fmtMMK(priceNum)}. Potentia's 20% (${fmtMMK(priceNum * COMMISSION)}) is billed once a month.`,
`ဝယ်သူက ${fmtMMK(priceNum)} ကို သင့်ဆီ တိုက်ရိုက်ပေးပါမယ်။ Potentia ရဲ့ 20% (${fmtMMK(priceNum * COMMISSION)}) ကို လစဉ် ငွေတောင်းခံပါမယ်။`
)}
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

/* ---------------- your bank details + QR ---------------- */
function PaymentSetup({ userId, current, onSaved }: { userId: string; current: SellerPay | null; onSaved: () => void }) {
const { L } = useL();
const [f, setF] = useState({
mmk_bank: current?.mmk_bank ?? '',
mmk_name: current?.mmk_name ?? '',
mmk_number: current?.mmk_number ?? '',
mmk_qr: current?.mmk_qr ?? null,
thb_bank: current?.thb_bank ?? '',
thb_name: current?.thb_name ?? '',
thb_number: current?.thb_number ?? '',
thb_qr: current?.thb_qr ?? null,
});
const [uploading, setUploading] = useState<'mmk' | 'thb' | null>(null);
const [saving, setSaving] = useState(false);
const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
const mmkRef = useRef<HTMLInputElement | null>(null);
const thbRef = useRef<HTMLInputElement | null>(null);

const set = (k: keyof typeof f, v: string | null) => setF(prev => ({ ...prev, [k]: v }));

const pickQr = async (which: 'mmk' | 'thb', file: File | undefined) => {
if (!file) return;
setUploading(which);
setMsg(null);
try {
set(which === 'mmk' ? 'mmk_qr' : 'thb_qr', await uploadPublic(userId, file, 1200));
} catch (e) {
console.error('qr upload failed', e);
setMsg({ ok: false, text: L('Could not upload the QR. Try again.', 'QR တင်လို့ မရပါ။ ပြန်ကြိုးစားပါ။') });
} finally {
setUploading(null);
}
};

const save = async () => {
if (!f.mmk_qr && !f.thb_qr) {
return setMsg({ ok: false, text: L('Add at least one payment QR.', 'ငွေလက်ခံ QR အနည်းဆုံး တစ်ခု ထည့်ပါ။') });
}
if (f.mmk_qr && (f.mmk_name.trim().length < 2 || f.mmk_bank.trim().length < 2)) {
return setMsg({ ok: false, text: L('Add the bank and account name for your Myanmar QR.', 'မြန်မာ QR အတွက် ဘဏ်အမည်နဲ့ အကောင့်အမည် ထည့်ပါ။') });
}
if (f.thb_qr && (f.thb_name.trim().length < 2 || f.thb_bank.trim().length < 2)) {
return setMsg({ ok: false, text: L('Add the bank and account name for your Thai QR.', 'ထိုင်း QR အတွက် ဘဏ်အမည်နဲ့ အကောင့်အမည် ထည့်ပါ။') });
}
setSaving(true);
setMsg(null);
const { error } = await supabase.from('seller_pay').upsert({ user_id: userId, ...f }, { onConflict: 'user_id' });
setSaving(false);
if (error) {
console.error('save pay failed', error);
return setMsg({ ok: false, text: error.message });
}
setMsg({ ok: true, text: L('Saved. Buyers now pay you with this QR.', 'သိမ်းပြီးပါပြီ။ ဝယ်သူတွေ ဒီ QR နဲ့ ငွေချေပါမယ်။') });
onSaved();
};

const block = (which: 'mmk' | 'thb') => {
const qr = which === 'mmk' ? f.mmk_qr : f.thb_qr;
const ref = which === 'mmk' ? mmkRef : thbRef;
return (
<div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
<p className="text-sm font-semibold text-[rgb(var(--gold))]">
{which === 'mmk' ? `🇲🇲 ${L('Myanmar bank (MMK)', 'မြန်မာဘဏ် (MMK)')}` : `🇹🇭 ${L('Thai bank (THB) · optional', 'ထိုင်းဘဏ် (THB) · မထည့်လည်းရ')}`}
</p>
<input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => pickQr(which, e.target.files?.[0])} />
<button
onClick={() => ref.current?.click()}
className="w-full rounded-2xl overflow-hidden relative flex items-center justify-center"
style={{ background: qr ? '#fff' : 'rgb(var(--muted) / 0.08)', border: '1px dashed rgb(var(--muted) / 0.3)', aspectRatio: qr ? '1 / 1' : undefined, minHeight: qr ? undefined : 120 }}
>
{qr ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={qr} alt="QR" className="w-full h-full object-contain" />
) : (
<span className="flex flex-col items-center gap-2 py-6 text-sm text-[rgb(var(--muted-hover))]">
<QrCode className="w-7 h-7 text-[rgb(var(--gold))]" />
{L('Upload your payment QR (screenshot from your bank app)', 'သင့်ဘဏ် app ထဲက ငွေလက်ခံ QR ကို တင်ပါ')}
</span>
)}
{uploading === which && (
<div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
<Loader2 className="w-6 h-6 animate-spin text-white" />
</div>
)}
</button>
{qr && (
<button onClick={() => set(which === 'mmk' ? 'mmk_qr' : 'thb_qr', null)} className="text-[11px] text-[rgb(var(--muted))] underline underline-offset-2">
{L('Remove this QR', 'ဒီ QR ကို ဖယ်ရန်')}
</button>
)}
{(
[
[`${which}_bank`, L('Bank (e.g. KBZPay, AYA, Wave)', 'ဘဏ် (ဥပမာ KBZPay, AYA, Wave)')],
[`${which}_name`, L('Account name', 'အကောင့်အမည်')],
[`${which}_number`, L('Account / phone number', 'အကောင့် / ဖုန်းနံပါတ်')],
] as [keyof typeof f, string][]
).map(([k, label]) => (
<div key={k}>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1">{label}</label>
<input
value={(f[k] as string) ?? ''}
onChange={e => set(k, e.target.value)}
maxLength={80}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
))}
</div>
);
};

return (
<div className="space-y-3">
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed px-1">
{L(
'Buyers pay YOU directly with this QR. You confirm each payment in Orders. Potentia bills you 20% of your confirmed sales on the 1st of every month.',
'ဝယ်သူတွေက ဒီ QR နဲ့ သင့်ကို တိုက်ရိုက် ငွေပေးပါမယ်။ Orders ထဲမှာ ငွေရောက်ကြောင်း အတည်ပြုပါ။ Potentia က လစဉ် ၁ ရက်နေ့မှာ အတည်ပြုထားတဲ့ အရောင်းရဲ့ 20% ကို ငွေတောင်းခံပါမယ်။'
)}
</p>
{block('mmk')}
{block('thb')}
{msg && (
<p className="text-xs rounded-lg px-3 py-2" style={msg.ok ? { color: 'rgb(var(--gold))', background: 'rgb(var(--gold) / 0.1)' } : { color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' }}>
{msg.text}
</p>
)}
<button
onClick={save}
disabled={saving || !!uploading}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={primaryBtn}
>
{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : L('Save payment details', 'ငွေလက်ခံ အချက်အလက် သိမ်းရန်')}
</button>
</div>
);
}

/* ---------------- pay a bill to Potentia ---------------- */
function PayBill({ bill, onClose, onSent }: { bill: SellerBill; onClose: () => void; onSent: () => void }) {
const { t, L } = useL();
const rate = useThbRate();
const [currency, setCurrency] = useState<Currency>('MMK');
const [proof, setProof] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');
const bank = BANKS.find(b => b.id === currency)!;
const due = currency === 'THB' ? mmkToThb(bill.commission_mmk, rate) : bill.commission_mmk;

const send = async () => {
if (!proof) return setError(t('Upload a screenshot of your payment first.'));
setBusy(true);
setError('');
const { error: err } = await supabase.rpc('submit_bill_proof', { p_bill: bill.id, p_proof: proof, p_currency: currency });
setBusy(false);
if (err) return setError(err.message);
notify('bill_paid', bill.id);
onSent();
onClose();
};

return (
<Sheet onClose={onClose} title={L('Pay Potentia', 'Potentia ကို ငွေပေးချေရန်')}>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-4">
{L('Potentia 20% for', 'Potentia 20% ·')} {monthLabel(bill.month)} · {bill.orders_count} {L('orders', 'အော်ဒါ')}
</p>
<div className="mb-4">
<BankPicker value={currency} onChange={setCurrency} />
</div>
<div className="mb-4">
<QrBox src={bank.qr} />
</div>
<div className="rounded-2xl p-4 mb-5 text-center" style={cardStyle}>
<span className="text-[11px] text-[rgb(var(--muted))] block">{t('Amount to send')}</span>
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">{fmt(due, currency)}</span>
</div>
<div className="mb-5">
<ProofUpload onChange={setProof} />
</div>
{error && <p className="text-xs text-[rgb(var(--err))] mb-3">{error}</p>}
<button
onClick={send}
disabled={busy || !proof}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={primaryBtn}
>
{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : t("I've Sent Payment")}
</button>
</Sheet>
);
}

/* ---------------- the shop ---------------- */
export default function SellerShop({ userId, onClose }: { userId: string; onClose: () => void }) {
const { t, L } = useL();
const [tab, setTab] = useState<'products' | 'orders' | 'payment' | 'bills'>('products');
const [products, setProducts] = useState<Product[]>([]);
const [orders, setOrders] = useState<Order[]>([]);
const [pay, setPay] = useState<SellerPay | null>(null);
const [bills, setBills] = useState<SellerBill[]>([]);
const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
const [viewing, setViewing] = useState<string | null>(null);
const [paying, setPaying] = useState<SellerBill | null>(null);
const [loading, setLoading] = useState(true);
const [editing, setEditing] = useState<Product | null | 'new'>(null);
const [busyId, setBusyId] = useState<string | null>(null);

const load = useCallback(async () => {
const [p, o, sp, b] = await Promise.all([
supabase.from('products').select('*').eq('seller_id', userId).order('created_at', { ascending: false }),
supabase.from('orders').select('*').eq('seller_id', userId).order('created_at', { ascending: false }).limit(300),
supabase.from('seller_pay').select('*').eq('user_id', userId).maybeSingle(),
supabase.from('seller_bills').select('*').eq('seller_id', userId).order('month', { ascending: false }).limit(24),
]);
if (p.error) console.error(p.error);
if (o.error) console.error(o.error);
const ords = (o.data as Order[]) ?? [];
setProducts((p.data as Product[]) ?? []);
setOrders(ords);
setPay((sp.data as SellerPay | null) ?? null);
setBills((b.data as SellerBill[]) ?? []);
// payment screenshots of orders waiting for you
const paths = ords.filter(x => x.status === 'pending' && x.pay_to === 'seller' && x.proof_path).map(x => x.proof_path as string);
if (paths.length) {
const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrls(paths, 3600);
const map: Record<string, string> = {};
((signed ?? []) as { path: string | null; signedUrl: string }[]).forEach(x => {
if (x.path && x.signedUrl) map[x.path] = x.signedUrl;
});
setProofUrls(map);
}
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

const confirmPaid = async (o: Order) => {
if (!confirm(L(`Did ${fmt(o.amount_due, o.currency)} arrive in your bank?`, `${fmt(o.amount_due, o.currency)} သင့်ဘဏ်ထဲ ရောက်ပြီလား?`))) return;
setBusyId(o.id);
const { error } = await supabase.rpc('seller_confirm_payment', { p_order: o.id });
if (error) alert(error.message);
else notify('order_confirmed', o.id);
setBusyId(null);
load();
};

const rejectOrder = async (o: Order) => {
const reason = prompt(
L('Why? The buyer will see this. (e.g. "Payment not received")', 'ဘာကြောင့်လဲ? ဝယ်သူ မြင်ရပါမယ်။ (ဥပမာ "ငွေ မရောက်ပါ")'),
L('Payment not received', 'ငွေ မရောက်ပါ')
);
if (reason === null) return;
setBusyId(o.id);
const { error } = await supabase.rpc('seller_reject_order', { p_order: o.id, p_reason: reason });
if (error) alert(error.message);
else notify('order_rejected', o.id);
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

/* numbers */
const toConfirm = orders.filter(o => o.status === 'pending' && o.pay_to === 'seller');
const toShip = orders.filter(o => o.status === 'paid');
const sold = orders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'completed');
const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const soldThisMonth = sold.filter(o => o.pay_to === 'seller' && new Date(o.paid_at ?? o.created_at) >= startMonth);
const monthSales = soldThisMonth.reduce((s, o) => s + o.total_mmk, 0);
const monthFee = soldThisMonth.reduce((s, o) => s + (o.commission_mmk ?? Math.round(o.total_mmk * COMMISSION)), 0);
const allSales = sold.reduce((s, o) => s + o.total_mmk, 0);
// old orders that were paid to Potentia: Potentia still owes the seller 80%
const legacyOwed = orders
.filter(o => o.pay_to !== 'seller' && (o.status === 'shipped' || o.status === 'completed') && o.payout_status === 'unpaid')
.reduce((s, o) => s + o.total_mmk * (1 - COMMISSION), 0);
const unpaidBills = bills.filter(b => b.status === 'unpaid');
const overdue = unpaidBills.some(b => new Date(b.due_at).getTime() < Date.now());
const visibleOrders = orders.filter(o => !(o.status === 'pending' && o.pay_to !== 'seller'));

const tabs = [
{ key: 'products' as const, label: t('Products'), badge: 0 },
{ key: 'orders' as const, label: t('Orders'), badge: toConfirm.length + toShip.length },
{ key: 'payment' as const, label: L('Payment', 'ငွေလက်ခံ'), badge: pay?.mmk_qr || pay?.thb_qr ? 0 : 1 },
{ key: 'bills' as const, label: L('Bills', 'ငွေတောင်းခံ'), badge: unpaidBills.length },
];

const billStatus = (b: SellerBill) => {
if (b.status === 'paid') return { text: L('Paid', 'ပေးပြီး'), color: 'rgb(var(--gold))' };
if (b.status === 'waived') return { text: L('Waived', 'ကင်းလွတ်'), color: 'rgb(var(--gold))' };
if (b.status === 'pending') return { text: L('Checking your payment', 'သင့်ငွေကို စစ်နေဆဲ'), color: 'rgb(var(--muted-hover))' };
if (new Date(b.due_at).getTime() < Date.now()) return { text: L('Overdue · shop paused', 'သတ်မှတ်ရက်ကျော် · ဆိုင် ခဏရပ်'), color: 'rgb(var(--err))' };
return { text: L(`Due ${new Date(b.due_at).toLocaleDateString()}`, `${new Date(b.due_at).toLocaleDateString()} နောက်ဆုံး`), color: 'rgb(var(--err))' };
};

return (
<>
<Sheet onClose={onClose} title={t('My Shop')}>
{overdue && (
<button
onClick={() => setTab('bills')}
className="w-full flex items-start gap-3 rounded-2xl p-4 mb-4 text-left"
style={{ background: 'rgb(var(--err) / 0.1)', border: '1px solid rgb(var(--err) / 0.35)' }}
>
<AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--err))' }} />
<span className="text-xs leading-relaxed" style={{ color: 'rgb(var(--err))' }}>
{L(
'Your shop is paused: a Potentia bill is overdue. Your products come back as soon as you pay.',
'Potentia ငွေတောင်းခံလွှာ ရက်ကျော်နေလို့ သင့်ဆိုင်ကို ခဏရပ်ထားပါတယ်။ ငွေပေးချေပြီးတာနဲ့ ပစ္စည်းတွေ ပြန်ပေါ်လာပါမယ်။'
)}
</span>
</button>
)}

<div className="grid grid-cols-4 gap-1 p-1 rounded-2xl mb-5" style={{ background: 'rgb(var(--muted) / 0.1)' }}>
{tabs.map(x => (
<button
key={x.key}
onClick={() => setTab(x.key)}
className="relative py-2.5 rounded-xl text-[12px] transition-all"
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
{!(pay?.mmk_qr || pay?.thb_qr) && (
<button
onClick={() => setTab('payment')}
className="w-full flex items-center gap-3 rounded-2xl p-4 text-left"
style={{ background: 'rgb(var(--gold) / 0.1)', border: '1px solid rgb(var(--gold) / 0.4)' }}
>
<QrCode className="w-5 h-5 flex-shrink-0 text-[rgb(var(--gold))]" />
<span className="text-xs text-[rgb(var(--gold))] leading-relaxed">
{L(
'Add your payment QR first. Buyers can’t buy from you until you do. Tap here.',
'ငွေလက်ခံ QR ကို အရင်ထည့်ပါ။ မထည့်မချင်း ဝယ်သူတွေ ဝယ်လို့မရပါ။ ဒီမှာ နှိပ်ပါ။'
)}
</span>
</button>
)}
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
<p className="text-[10px] mt-0.5" style={{ color: p.hidden_by_admin || overdue ? 'rgb(var(--err))' : 'rgb(var(--muted))' }}>
{p.hidden_by_admin
? t('Hidden by Potentia. Contact us.')
: overdue
? L('Hidden until your bill is paid', 'ငွေတောင်းခံလွှာ ပေးပြီးမှ ပြန်ပေါ်ပါမယ်')
: p.active
? t('On sale')
: t('Paused')}
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
{visibleOrders.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<Truck className="w-7 h-7 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">{t('No orders yet.')}</p>
</div>
) : (
visibleOrders.map(o => {
const waiting = o.status === 'pending' && o.pay_to === 'seller';
const proofUrl = o.proof_path ? proofUrls[o.proof_path] : null;
return (
<div
key={o.id}
className="rounded-2xl p-4"
style={waiting || o.status === 'paid' ? { ...cardStyle, border: '1px solid rgb(var(--gold) / 0.5)' } : cardStyle}
>
<div className="flex items-start justify-between gap-3 mb-3">
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium">
{o.qty} × {o.product_name}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{new Date(o.paid_at ?? o.created_at).toLocaleDateString()} · {fmt(o.amount_due, o.currency)}
</p>
{o.status === 'cancelled' && o.cancel_reason && <p className="text-[11px] text-[rgb(var(--err))]">{o.cancel_reason}</p>}
</div>
{waiting ? (
<span className="text-[10px] rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: 'rgb(var(--gold) / 0.15)', color: 'rgb(var(--gold))' }}>
{L('Check payment', 'ငွေ စစ်ရန်')}
</span>
) : (
<StatusPill status={o.status} />
)}
</div>

{waiting && (
<>
{proofUrl ? (
<button
onClick={() => setViewing(proofUrl)}
className="w-full flex items-center gap-3 rounded-xl p-2 mb-3 text-left"
style={{ background: 'rgb(var(--muted) / 0.08)', border: '1px solid rgb(var(--muted) / 0.18)' }}
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={proofUrl} alt="Payment proof" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
<span className="text-xs text-[rgb(var(--muted-hover))]">
<span className="block text-[rgb(var(--gold))] font-medium">{L("Buyer's payment screenshot", 'ဝယ်သူ၏ ငွေလွှဲ screenshot')}</span>
{L('Tap to view. Always check your bank app too.', 'နှိပ်ပြီး ကြည့်ပါ။ ဘဏ် app မှာလည်း အမြဲစစ်ပါ။')}
</span>
</button>
) : (
<p className="text-xs text-[rgb(var(--muted))] mb-3">{L('Check your bank app for this payment.', 'ဒီငွေကို ဘဏ် app မှာ စစ်ပါ။')}</p>
)}
<div className="grid grid-cols-3 gap-2">
<button
onClick={() => rejectOrder(o)}
disabled={busyId === o.id}
className="flex items-center justify-center gap-1.5 text-xs rounded-xl py-3 disabled:opacity-50"
style={ghostBtn}
>
<X className="w-4 h-4" /> {L('Not received', 'မရောက်')}
</button>
<button
onClick={() => confirmPaid(o)}
disabled={busyId === o.id}
className="col-span-2 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 disabled:opacity-50"
style={primaryBtn}
>
{busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
{L('Payment received', 'ငွေရောက်ပြီ')}
</button>
</div>
</>
)}

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
);
})
)}
</div>
) : tab === 'payment' ? (
<PaymentSetup userId={userId} current={pay} onSaved={load} />
) : (
<div className="space-y-3">
<div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.25)' }}>
<div className="flex items-center gap-2 mb-1">
<Wallet className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{L('This month so far', 'ဒီလ အထိ')}</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))]">{fmtMMK(monthSales)}</div>
<p className="text-[11px] text-[rgb(var(--muted))] mt-1">
{soldThisMonth.length} {L('confirmed orders', 'အတည်ပြုထားသော အော်ဒါ')} · {L('Potentia 20%', 'Potentia 20%')} {fmtMMK(monthFee)} ·{' '}
{L('billed on the 1st', 'လာမယ့်လ ၁ ရက်နေ့ ငွေတောင်းခံမယ်')}
</p>
</div>

{bills.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<ReceiptText className="w-6 h-6 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">{L('No bills yet.', 'ငွေတောင်းခံလွှာ မရှိသေးပါ။')}</p>
</div>
) : (
bills.map(b => {
const st = billStatus(b);
return (
<div key={b.id} className="rounded-2xl p-4" style={b.status === 'unpaid' ? { ...cardStyle, border: '1px solid rgb(var(--err) / 0.35)' } : cardStyle}>
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium">{monthLabel(b.month)}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{b.orders_count} {L('orders', 'အော်ဒါ')} · {L('sales', 'အရောင်း')} {fmtMMK(b.sales_mmk)}
</p>
<p className="text-[11px] font-medium mt-0.5" style={{ color: st.color }}>
{st.text}
</p>
{b.note && <p className="text-[11px] text-[rgb(var(--err))] mt-0.5">{b.note}</p>}
</div>
<div className="text-right flex-shrink-0">
<p className="font-display text-lg font-bold text-[rgb(var(--gold))]">{fmtMMK(b.commission_mmk)}</p>
<p className="text-[10px] text-[rgb(var(--muted))]">Potentia 20%</p>
</div>
</div>
{b.status === 'unpaid' && (
<button onClick={() => setPaying(b)} className="w-full mt-3 font-semibold py-3 rounded-xl text-sm" style={primaryBtn}>
{L('Pay now', 'ယခု ပေးချေရန်')}
</button>
)}
</div>
);
})
)}

<div className="grid grid-cols-2 gap-3">
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('All-time sales')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{fmtMMK(allSales)}</p>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t('Orders')}</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{sold.length}</p>
</div>
</div>
{legacyOwed > 0 && (
<p className="text-[11px] text-[rgb(var(--muted))] px-1">
{L(`From older orders paid to Potentia, we still owe you ${fmtMMK(legacyOwed)}.`, `Potentia ကို ပေးခဲ့တဲ့ အော်ဒါဟောင်းများအတွက် သင့်ကို ${fmtMMK(legacyOwed)} ပေးရန် ကျန်ပါသေးတယ်။`)}
</p>
)}
<p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed px-1">
{L(
'Bills are made on the 1st for last month and are due by the 7th. If a bill is still unpaid after that, your products are hidden until you pay.',
'လစဉ် ၁ ရက်နေ့မှာ ပြီးခဲ့တဲ့လအတွက် ငွေတောင်းခံပြီး ၇ ရက်နေ့ နောက်ဆုံးထား ပေးရပါမယ်။ မပေးရသေးရင် ငွေပေးချေတဲ့အထိ သင့်ပစ္စည်းတွေကို ဖျောက်ထားပါမယ်။'
)}
</p>
</div>
)}
{viewing && (
<button
onClick={() => setViewing(null)}
className="fixed inset-0 z-[200] flex items-center justify-center p-4"
style={{ background: 'rgb(0 0 0 / 0.92)' }}
aria-label="Close"
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={viewing} alt="Payment proof" className="max-w-full max-h-full object-contain rounded-xl" />
</button>
)}
</Sheet>

{editing && (
<ProductForm userId={userId} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
)}
{paying && <PayBill bill={paying} onClose={() => setPaying(null)} onSent={load} />}
</>
);
}

