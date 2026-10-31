// lib/payments.ts — prices, banks and currency in one place.
// MMK prices are fixed. THB prices follow the rate you set in Admin → Revenue (1 THB = ? MMK).

export const THB_TO_MMK = 138.7; // fallback only, used if the live rate can't load
export const COMMISSION = 0.2; // Potentia keeps 20% of every shop sale
export const TRIAL_OFFER_MMK = 39000; // first month price, 48 hours after the free trial ends

export type Currency = 'MMK' | 'THB';

export const PLANS: Record<string, { label: string; months: number; mmk: number; note: string }> = {
'1month': { label: '1 Month', months: 1, mmk: 60000, note: '' },
'6months': { label: '6 Months', months: 6, mmk: 299000, note: 'Save 17%' },
'1year': { label: '1 Year', months: 12, mmk: 499000, note: 'Save 31%' },
};
export const PLAN_IDS = ['1month', '6months', '1year'];
export const PAID_TIERS = PLAN_IDS;

// Your two bank QR codes. Put the images in the public folder with these exact names.
export const BANKS: { id: Currency; label: string; flag: string; qr: string }[] = [
{ id: 'MMK', label: 'Myanmar bank', flag: '🇲🇲', qr: '/premium-qr.png' },
{ id: 'THB', label: 'Thai bank', flag: '🇹🇭', qr: '/premium-qr-thai.png' },
];

export const fmtMMK = (n: number) => `${Math.round(n).toLocaleString('en-US')} MMK`;
export const fmtTHB = (n: number) => `${Math.round(n).toLocaleString('en-US')} THB`;
export const fmt = (n: number, c: Currency) => (c === 'THB' ? fmtTHB(n) : fmtMMK(n));

/** Premium price in THB: MMK / rate, rounded to the nearest 10 baht (same formula as the database). */
export const planThb = (mmk: number, rate: number) => Math.round(mmk / rate / 10) * 10;
/** Shop price in THB: whole baht, rounded up (same as the database). */
export const mmkToThb = (mmk: number, rate: number = THB_TO_MMK) => Math.ceil(mmk / rate);
/** What a payment is worth in MMK. */
export const toMMK = (amount: number, c: Currency, rate: number = THB_TO_MMK) =>
c === 'THB' ? Math.round(amount * rate) : Math.round(amount);

/** Price of a plan in the chosen currency. offer = the 39,000 MMK trial-ending deal (1 Month only). */
export const planPrice = (planId: string, c: Currency, rate: number = THB_TO_MMK, offer = false) => {
const mmk = offer && planId === '1month' ? TRIAL_OFFER_MMK : (PLANS[planId] ?? PLANS['1month']).mmk;
return c === 'THB' ? planThb(mmk, rate) : mmk;
};

