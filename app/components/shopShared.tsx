'use client';

// app/components/shopShared.tsx — pieces used by both the Marketplace and the seller's shop.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../../lib/i18n';
import type { Currency } from '../../lib/payments';
import { ImageOff, ChevronLeft } from 'lucide-react';

export type Product = {
id: string;
seller_id: string;
shop_name: string;
name: string;
description: string;
category: string;
price_mmk: number;
image_url: string | null;
active: boolean;
hidden_by_admin?: boolean;
created_at: string;
};

export type Order = {
id: string;
product_id: string | null;
buyer_id: string;
seller_id: string;
shop_name: string;
product_name: string;
image_url: string | null;
qty: number;
unit_price_mmk: number;
total_mmk: number;
currency: Currency;
amount_due: number;
buyer_name: string;
buyer_phone: string;
buyer_address: string;
note: string | null;
status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
payout_status: 'unpaid' | 'paid';
created_at: string;
paid_at: string | null;
shipped_at: string | null;
paid_out_at: string | null;
};

export const PRODUCT_CATEGORIES = ['Skincare', 'Fitness', 'Nutrition', 'Grooming', 'Style', 'Other'];

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
pending: 'Checking payment',
paid: 'Paid · waiting to ship',
shipped: 'Shipped',
completed: 'Delivered',
cancelled: 'Cancelled',
};

export const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};
export const inputStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.2)',
fontSize: 16, // stops iOS zooming into the field
};
export const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };

export function StatusPill({ status }: { status: Order['status'] }) {
const { t } = useLang();
const good = status === 'paid' || status === 'shipped' || status === 'completed';
return (
<span
className="text-[10px] tracking-wide rounded-full px-2.5 py-1 whitespace-nowrap"
style={{
background: status === 'cancelled' ? 'rgb(var(--err) / 0.12)' : good ? 'rgb(var(--gold) / 0.15)' : 'rgb(var(--muted) / 0.12)',
color: status === 'cancelled' ? 'rgb(var(--err))' : good ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))',
}}
>
{t(ORDER_STATUS_LABEL[status])}
</span>
);
}

export function ProductImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
const [broken, setBroken] = useState(false);
if (!src || broken) {
return (
<div className={`flex items-center justify-center ${className}`} style={{ background: 'rgb(var(--muted) / 0.1)' }}>
<ImageOff className="w-6 h-6 text-[rgb(var(--muted))]" />
</div>
);
}
// eslint-disable-next-line @next/next/no-img-element
return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setBroken(true)} loading="lazy" />;
}

/** Full-screen layer on top of the whole app (above the bottom menu). */
export function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
return createPortal(
<div className="fixed inset-0 z-[100] flex justify-center backdrop-blur-sm" style={{ background: 'rgb(0 0 0 / 0.75)' }}>
<div
className="w-full max-w-md h-[100dvh] overflow-y-auto overscroll-contain font-body relative"
style={{ background: 'rgb(var(--bg))', paddingTop: 'max(calc(env(safe-area-inset-top) + 8px), 48px)' }}
>
<div className="flex items-center gap-3 px-5 pb-3">
<button
onClick={onClose}
aria-label="Close"
className="w-9 h-9 rounded-full flex items-center justify-center text-[rgb(var(--muted-hover))] flex-shrink-0"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
>
<ChevronLeft className="w-5 h-5" />
</button>
<span className="font-display text-base font-semibold text-[rgb(var(--gold))] truncate">{title}</span>
</div>
<div className="px-5" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 24px), 32px)' }}>
{children}
</div>
</div>
</div>,
document.body,
);
}

