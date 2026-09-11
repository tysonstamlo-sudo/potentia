'use client';

import React from 'react';
import { X, Crown, Loader2 } from 'lucide-react';

type PremiumModalProps = {
onClose: () => void;
onConfirm: () => void;
submitting: boolean;
};

export default function PremiumModal({ onClose, onConfirm, submitting }: PremiumModalProps) {
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

<p className="text-sm text-[#B0A48F] mb-6 leading-relaxed">
Scan the QR code below with your banking app to send payment. Once done, tap
&quot;I&apos;ve Sent Payment&quot; and your account will be upgraded once we confirm the transfer.
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
Amount: <span className="text-[#C9A24B] font-medium">85,000 MMK</span> (~$20 USD)
</p>

<button
onClick={onConfirm}
disabled={submitting}
className="w-full flex items-center justify-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] disabled:opacity-50 text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em] uppercase"
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've Sent Payment"}
</button>

<button
onClick={onClose}
className="w-full text-center text-xs text-[#7A6E5D] hover:text-[#B0A48F] mt-4 transition-colors"
>
Cancel
</button>
</div>
</div>
);
}

