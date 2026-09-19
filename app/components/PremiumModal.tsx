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

export default function PremiumModal({ onClose, onConfirm, submitting }: PremiumModalProps) {
const [selectedPlan, setSelectedPlan] = useState('1month');
const [step, setStep] = useState<'select' | 'pay'>('select');

const plan = PLANS.find(p => p.id === selectedPlan)!;

return (
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
<div className="w-full max-w-sm border border-[#C9A24B]/30 bg-[#0D0D0D] rounded-sm p-8 relative font-body">
<button
onClick={onClose}
className="absolute top-4 right-4 text-[#7A6E5D] hover:text-[#C9A24B] transition-colors"
>
<X className="w-4 h-4" />
</button>

<div className="flex items-center gap-2 mb-6">
<Crown className="w-4 h-4 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.25em] text-[#C9A24B] uppercase">Go Premium</span>
</div>

{step === 'select' ? (
<>
<p className="text-sm text-[#B0A48F] mb-6 leading-relaxed">
Choose your plan.
</p>
<div className="space-y-3 mb-8">
{PLANS.map(p => (
<button
key={p.id}
onClick={() => setSelectedPlan(p.id)}
className={`w-full flex items-center justify-between p-4 rounded-sm border transition-all text-left ${
selectedPlan === p.id
? 'border-[#C9A24B] bg-[#C9A24B]/[0.06]'
: 'border-[#7A6E5D]/30 hover:border-[#7A6E5D]/60'
}`}
>
<div>
<div className="flex items-center gap-2">
<span className="text-sm text-[#C9A24B] font-medium">{p.label}</span>
{p.note && (
<span className="text-[9px] text-[#7A6E5D] border border-[#7A6E5D]/30 rounded-full px-2 py-0.5">{p.note}</span>
)}
</div>
<span className="text-xs text-[#7A6E5D]">{p.priceMMK} MMK (~{p.priceUSD})</span>
</div>
{selectedPlan === p.id && <Check className="w-4 h-4 text-[#C9A24B] flex-shrink-0" />}
</button>
))}
</div>
<button
onClick={() => setStep('pay')}
className="w-full border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em] uppercase"
>
Continue
</button>
</>
) : (
<>
<p className="text-sm text-[#B0A48F] mb-6 leading-relaxed">
Scan with your banking app to pay for the <span className="text-[#C9A24B]">{plan.label}</span> plan.
Once done, tap &quot;I&apos;ve Sent Payment&quot; below.
</p>

{/* Replace this image with your real bank QR — place the file at
public/premium-qr.png in your project */}
<div className="w-full aspect-square bg-white flex items-center justify-center mb-4 rounded-sm overflow-hidden">
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

<p className="text-center text-xs text-[#7A6E5D] mb-6">
Amount: <span className="text-[#C9A24B] font-medium">{plan.priceMMK} MMK</span> (~{plan.priceUSD} USD)
</p>

<button
onClick={() => onConfirm(selectedPlan)}
disabled={submitting}
className="w-full flex items-center justify-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] disabled:opacity-50 text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em] uppercase"
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've Sent Payment"}
</button>

<button
onClick={() => setStep('select')}
className="w-full text-center text-xs text-[#7A6E5D] hover:text-[#B0A48F] mt-4 transition-colors"
>
Back
</button>
</>
)}
</div>
</div>
);
}

