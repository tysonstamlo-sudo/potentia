'use client';

import React, { useState } from 'react';
import { X, Crown, Loader2, Check } from 'lucide-react';

type PremiumModalProps = {
onClose: () => void;
onConfirm: (plan: string) => void;
submitting: boolean;
};

const PLANS = [
{ id: '1month', label: '1 Month', priceMMK: '85,000', priceUSD: '$20', note: '' },
{ id: '6months', label: '6 Months', priceMMK: '450,000', priceUSD: '$105', note: 'Save ~12%' },
{ id: '1year', label: '1 Year', priceMMK: '800,000', priceUSD: '$188', note: 'Save ~22%' },
];

const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };

export default function PremiumModal({ onClose, onConfirm, submitting }: PremiumModalProps) {
const [selectedPlan, setSelectedPlan] = useState('1month');
const [step, setStep] = useState<'select' | 'pay'>('select');

const plan = PLANS.find(p => p.id === selectedPlan)!;

return (
<div
className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 z-50 backdrop-blur-sm"
style={{ background: 'rgb(0 0 0 / 0.7)' }}
>
<div
className="w-full max-w-sm rounded-t-3xl md:rounded-3xl p-7 relative font-body max-h-[92vh] overflow-y-auto safe-bottom"
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

<div className="flex items-center gap-2 mb-6">
<span
className="w-8 h-8 rounded-xl flex items-center justify-center"
style={{ background: 'rgb(var(--gold) / 0.14)' }}
>
<Crown className="w-4 h-4 text-[rgb(var(--gold))]" />
</span>
<span className="font-display text-sm tracking-[0.15em] text-[rgb(var(--gold))] uppercase">Go Premium</span>
</div>

{step === 'select' ? (
<>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
Unlimited scans, full measurement tables and all weak-point reports. Choose your plan.
</p>
<div className="space-y-3 mb-7">
{PLANS.map(p => {
const active = selectedPlan === p.id;
return (
<button
key={p.id}
onClick={() => setSelectedPlan(p.id)}
className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left"
style={{
background: active ? 'rgb(var(--gold) / 0.1)' : 'rgb(var(--surface) / 0.5)',
border: `1px solid ${active ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.18)'}`,
boxShadow: active ? '0 0 16px rgb(var(--gold) / 0.15)' : 'none',
}}
>
<div>
<div className="flex items-center gap-2 mb-0.5">
<span className="text-sm text-[rgb(var(--gold))] font-medium">{p.label}</span>
{p.note && (
<span
className="text-[9px] text-[rgb(var(--gold))] rounded-full px-2 py-0.5"
style={{ background: 'rgb(var(--gold) / 0.14)' }}
>
{p.note}
</span>
)}
</div>
<span className="text-xs text-[rgb(var(--muted))]">{p.priceMMK} MMK (~{p.priceUSD})</span>
</div>
{active && <Check className="w-4 h-4 text-[rgb(var(--gold))] flex-shrink-0" />}
</button>
);
})}
</div>
<button
onClick={() => setStep('pay')}
className="w-full font-medium py-3.5 rounded-xl text-[13px] tracking-wide"
style={primaryBtn}
>
Continue
</button>
</>
) : (
<>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
Scan with your banking app to pay for the <span className="text-[rgb(var(--gold))]">{plan.label}</span> plan.
Once done, tap &quot;I&apos;ve Sent Payment&quot; below.
</p>

{/* Replace this image with your real bank QR — place the file at
public/premium-qr.png in your project */}
<div className="w-full aspect-square bg-white flex items-center justify-center mb-4 rounded-2xl overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src="/premium-qr.png"
alt="Payment QR code"
className="w-full h-full object-contain"
onError={(e) => {
(e.target as HTMLImageElement).style.display = 'none';
const parent = (e.target as HTMLImageElement).parentElement;
if (parent) parent.innerHTML = '<span style="color:#999;font-size:12px;padding:16px;text-align:center;">QR code not found — add premium-qr.png to your public folder</span>';
}}
/>
</div>

<p className="text-center text-xs text-[rgb(var(--muted))] mb-6">
Amount: <span className="text-[rgb(var(--gold))] font-medium">{plan.priceMMK} MMK</span> (~{plan.priceUSD} USD)
</p>

<button
onClick={() => onConfirm(selectedPlan)}
disabled={submitting}
className="w-full flex items-center justify-center gap-2 disabled:opacity-50 font-medium py-3.5 rounded-xl text-[13px] tracking-wide"
style={primaryBtn}
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've Sent Payment"}
</button>

<button
onClick={() => setStep('select')}
className="w-full text-center text-xs text-[rgb(var(--muted))] mt-4"
>
Back
</button>
</>
)}
</div>
</div>
);
}

