'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Store, Loader2, CheckCircle2, Clock } from 'lucide-react';

const CATEGORIES = ['Skincare', 'Fitness', 'Nutrition', 'Grooming', 'Style', 'Other'];

type ExistingApp = { status: string; business_name: string } | null;

const inputStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.2)',
fontSize: 16, // 16px stops iOS zooming into the field
};

export default function SellerModal({ onClose }: { onClose: () => void }) {
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
if (!userId || !valid || submitting) return;
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
setError('Could not send your application. Please try again.');
return;
}
setDone(true);
};

return (
<div
className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 z-50 backdrop-blur-sm"
style={{ background: 'rgb(0 0 0 / 0.7)' }}
>
<div
className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 relative font-body max-h-[92vh] overflow-y-auto safe-bottom"
style={{
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.97) 45%)',
border: '1px solid rgb(var(--gold) / 0.25)',
}}
>
<button
onClick={onClose}
aria-label="Close"
className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[rgb(var(--muted))]"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
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
Sell on Potentia
</span>
</div>

{loading ? (
<div className="flex justify-center py-10">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : done ? (
<div className="text-center py-6">
<CheckCircle2 className="w-9 h-9 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">Application sent</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
We will review it and contact you using the details you gave.
</p>
<button
onClick={onClose}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
Close
</button>
</div>
) : existing ? (
<div className="text-center py-6">
<Clock className="w-9 h-9 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">
{existing.status === 'approved'
? 'You are approved'
: existing.status === 'rejected'
? 'Application not approved'
: 'Application under review'}
</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
{existing.business_name} ·{' '}
{existing.status === 'approved'
? 'We will contact you to set up your listings.'
: existing.status === 'rejected'
? 'You can contact us if you think this is a mistake.'
: 'We will contact you once it has been reviewed.'}
</p>
<button
onClick={onClose}
className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }}
>
Close
</button>
</div>
) : (
<>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
Tell us about your business. We review every application before anything is listed.
</p>

<div className="space-y-4">
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">Business or brand name</label>
<input
value={business}
onChange={e => setBusiness(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
How should we contact you? (phone, Viber, Telegram or email)
</label>
<input
value={contact}
onChange={e => setContact(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">Category</label>
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
{c}
</button>
);
})}
</div>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
What do you sell? (at least 20 characters)
</label>
<textarea
value={description}
onChange={e => setDescription(e.target.value)}
rows={3}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none resize-none"
style={inputStyle}
/>
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">
Website or social page (optional)
</label>
<input
value={link}
onChange={e => setLink(e.target.value)}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>

<label className="flex gap-3 items-start text-[11px] text-[rgb(var(--muted))] leading-relaxed">
<input
type="checkbox"
checked={agree}
onChange={e => setAgree(e.target.checked)}
className="mt-0.5"
/>
<span>I confirm my products are real, safe and legal to sell, and the details above are true.</span>
</label>

{error && <p className="text-xs text-[rgb(var(--err))]">{error}</p>}

<button
onClick={submit}
disabled={!valid || submitting}
className="w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-xl text-[13px] tracking-wide disabled:opacity-40"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send application'}
</button>
</div>
</>
)}
</div>
</div>
);
}

