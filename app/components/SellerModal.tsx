'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { X, Store, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { useLang } from '../../lib/i18n';

const CATEGORIES = ['Skincare', 'Fitness', 'Nutrition', 'Grooming', 'Style', 'Other'];

type ExistingApp = { status: string; business_name: string } | null;

const inputStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.2)',
fontSize: 16, // 16px stops iOS zooming into the field
};

export default function SellerModal({ onClose, onOpenShop }: { onClose: () => void; onOpenShop?: () => void }) {
const { t } = useLang();
const [userId, setUserId] = useState<string | null>(null);
const [existing, setExisting] = useState<ExistingApp>(null);
const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [done, setDone] = useState(false);
const [error, setError] = useState('');

const [business, setBusiness] = useState('');
const [contact, setContact] = useState('');
const [category, setCategory] = useState('Skincare');
const [description, setDescription] = useState('');
const [link, setLink] = useState('');
const [agree, setAgree] = useState(false);

useEffect(() => {
const load = async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (session) {
setUserId(session.user.id);
const { data } = await supabase
.from('seller_applications')
.select('status, business_name')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1);
if (data && data[0]) setExisting(data[0]);
}
setLoading(false);
};
load();
}, []);

const valid = business.trim().length >= 2 && contact.trim().length >= 3 && description.trim().length >= 20 && agree;

const submit = async () => {
if (submitting) return;
// Tell the user exactly what is missing instead of a dead button
if (!userId) return setError(t('Please log in again, then try.'));
if (business.trim().length < 2) return setError(t('Add your business or brand name.'));
if (contact.trim().length < 3) return setError(t('Add a phone, Viber, Telegram or email so we can contact you.'));
if (description.trim().length < 20)
return setError(t('Describe what you sell in at least 20 characters ({n}/20).', { n: description.trim().length }));
if (!agree) return setError(t('Tick the box to confirm your products are real, safe and legal.'));
setSubmitting(true);
setError('');
const { error: err } = await supabase.from('seller_applications').insert({
user_id: userId,
business_name: business.trim(),
contact: contact.trim(),
category,
description: description.trim(),
link: link.trim() || null,
});
setSubmitting(false);
if (err) {
console.error('Seller application failed:', err);
setError(t('Could not send your application. Please try again.'));
return;
}
setDone(true);
};

// Render on top of the whole app (above the bottom menu), not inside the Shop tab
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;

return createPortal(
<div
className="fixed inset-0 flex items-stretch md:items-center justify-center p-0 md:p-4 z-[100] backdrop-blur-sm"
style={{ background: 'rgb(0 0 0 / 0.75)' }}
>
<div
className="w-full max-w-md md:rounded-3xl px-6 relative font-body h-[100dvh] md:h-auto md:max-h-[90dvh] overflow-y-auto overscroll-contain"
style={{
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface)) 45%)',
border: '1px solid rgb(var(--gold) / 0.25)',
paddingTop: 'max(env(safe-area-inset-top), 24px)',
}}
>
<button
onClick={onClose}
aria-label="Close"
className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center text-[rgb(var(--muted))]"
style={{ background: 'rgb(var(--muted) / 0.12)', top: 'max(env(safe-area-inset-top), 20px)' }}
>
<X className="w-4 h-4" />
</button>

<div className="flex items-center gap-2 mb-5">
<span
className="w-8 h-8 rounded-xl flex items-center justify-center"
style={{ background: 'rgb(var(--gold) / 0.14)' }}
>
<Store className="w-4 h-4 text-[rgb(var(--gold))]" />
</span>
<span className="font-display text-sm tracking-[0.15em] text-[rgb(var(--gold))] uppercase">
{t("Sell on Potentia")}
</span>
</div>

{loading ? (
<div className="flex justify-center py-10">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : done ? (
<div className="text-center py-6">
<CheckCircle2 className="w-9 h-9 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">{t("Application sent")}</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
{t("We will review it and contact you using the details you gave.")}
</p>
<button
onClick={onClose}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t("Close")}
</button>
</div>
) : existing ? (
<div className="text-center py-6">
<Clock className="w-9 h-9 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">
{existing.status === 'approved'
? t('You are approved')
: existing.status === 'rejected'
? t('Application not approved')
: t('Application under review')}
</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
{existing.business_name} ·{' '}
{existing.status === 'approved'
? t('You can add your products now.')
: existing.status === 'rejected'
? t('You can contact us if you think this is a mistake.')
: t('We will contact you once it has been reviewed.')}
</p>
<div className="flex flex-col gap-3 items-center">
{existing.status === 'approved' && onOpenShop && (
<button
onClick={onOpenShop}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t('Open my shop')}
</button>
)}
{existing.status !== 'approved' && (
<button
onClick={() => {
// Let them try again: prefill with what they sent last time
setBusiness(existing.business_name);
setExisting(null);
setError('');
}}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{existing.status === 'rejected' ? t('Apply again') : t('Send an updated application')}
</button>
)}
<button
onClick={onClose}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }}
>
{t("Close")}
</button>
</div>
</div>
) : (
<>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
{t("Tell us about your business. We review every application before anything is listed.")}
</p>

<div
className="rounded-xl p-4 mb-5"
style={{ background: 'rgb(var(--gold) / 0.08)', border: '1px solid rgb(var(--gold) / 0.25)' }}
>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-2">{t('How selling works')}</span>
<ul className="space-y-1.5 text-[12px] text-[rgb(var(--muted-hover))] leading-relaxed">
<li>• {t('Buyers pay Potentia directly through the app.')}</li>
<li>• {t('You ship the order once we confirm the payment.')}</li>
<li>• {t('Potentia keeps 20% of every sale. You receive 80%, paid out monthly.')}</li>
</ul>
</div>

<div className="space-y-4">
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t("Business or brand name")}</label>
<input
value={business}
onChange={e => setBusiness(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
{t("How should we contact you? (phone, Viber, Telegram or email)")}
</label>
<input
value={contact}
onChange={e => setContact(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t("Category")}</label>
<div className="flex flex-wrap gap-2">
{CATEGORIES.map(c => {
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
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
{t("What do you sell? (at least 20 characters)")}
</label>
<textarea
value={description}
onChange={e => setDescription(e.target.value)}
rows={3}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none resize-none"
style={inputStyle}
/>
<p
className="text-[10px] text-right mt-1"
style={{ color: description.trim().length >= 20 ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }}
>
{description.trim().length}/20
</p>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
{t("Website or social page (optional)")}
</label>
<input
value={link}
onChange={e => setLink(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>

<label
className="flex gap-3 items-start text-[12px] text-[rgb(var(--muted-hover))] leading-relaxed rounded-xl p-3 cursor-pointer"
style={{ background: 'rgb(var(--muted) / 0.08)', border: `1px solid ${agree ? 'rgb(var(--gold) / 0.5)' : 'rgb(var(--muted) / 0.2)'}` }}
>
<input
type="checkbox"
checked={agree}
onChange={e => setAgree(e.target.checked)}
className="mt-0.5 w-5 h-5 flex-shrink-0 accent-[rgb(var(--gold))]"
/>
<span>{t("I confirm my products are real, safe and legal to sell, the details above are true, and I agree to the 20% Potentia commission.")}</span>
</label>

</div>

<div
className="sticky bottom-0 -mx-6 px-6 pt-3 mt-4"
style={{
background: 'rgb(var(--surface))',
borderTop: '1px solid rgb(var(--muted) / 0.15)',
paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
}}
>
{error && <p className="text-xs text-[rgb(var(--err))] mb-2">{error}</p>}
<button
onClick={submit}
disabled={submitting}
className="w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-xl text-[14px] tracking-wide transition-opacity"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', opacity: valid ? 1 : 0.6 }}
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Send application')}
</button>
</div>
</>
)}
</div>
</div>,
document.body,
);
}

