// lib/payments.ts — one place for prices, banks and currency. Change numbers here only.

export const THB_TO_MMK = 138.7; // 1 Thai baht = 138.7 kyat
export const COMMISSION = 0.2; // Potentia keeps 20% of every shop sale

export type Currency = 'MMK' | 'THB';

// Fixed Premium prices. THB is rounded so it never changes by itself.
export const PLANS: Record<string, { label: string; months: number; mmk: number; thb: number; note: string }> = {
'1month': { label: '1 Month', months: 1, mmk: 60000, thb: 430, note: '' },
'6months': { label: '6 Months', months: 6, mmk: 299000, thb: 2160, note: 'Save 17%' },
'1year': { label: '1 Year', months: 12, mmk: 499000, thb: 3600, note: 'Save 31%' },
};
export const PLAN_IDS = ['1month', '6months', '1year'];

// Your two bank QR codes. Put the images in the public folder with these exact names.
export const BANKS: { id: Currency; label: string; flag: string; qr: string }[] = [
{ id: 'MMK', label: 'Myanmar bank', flag: '🇲🇲', qr: '/premium-qr.png' },
{ id: 'THB', label: 'Thai bank', flag: '🇹🇭', qr: '/premium-qr-thai.png' },
];

export const fmtMMK = (n: number) => `${Math.round(n).toLocaleString('en-US')} MMK`;
export const fmtTHB = (n: number) => `${Math.round(n).toLocaleString('en-US')} THB`;
export const fmt = (n: number, c: Currency) => (c === 'THB' ? fmtTHB(n) : fmtMMK(n));

/** Shop prices are set in MMK. Thai buyers pay this many baht (rounded up). */
export const mmkToThb = (mmk: number) => Math.ceil(mmk / THB_TO_MMK);
/** For revenue: what a payment is worth in MMK. */
export const toMMK = (amount: number, c: Currency) => (c === 'THB' ? Math.round(amount * THB_TO_MMK) : Math.round(amount));

export const planPrice = (planId: string, c: Currency) => {
const p = PLANS[planId] ?? PLANS['1month'];
return c === 'THB' ? p.thb : p.mmk;
};

