// lib/payments.ts — prices, banks and currency in one place.
// MMK prices are fixed. THB prices follow the rate you set in Admin → Revenue (1 THB = ? MMK).
// PROMO: lower prices until PROMO_ENDS, then the normal prices come back by themselves.
// (Keep in sync with the plan_mmk() / offer_mmk() functions in promo.sql.)

export const THB_TO_MMK = 138.7; // fallback only, used if the live rate can't load
export const COMMISSION = 0.2; // Potentia keeps 20% of every shop sale

export type Currency = 'MMK' | 'THB';

export const PLANS: Record<string, { label: string; months: number; days?: number; mmk: number }> = {
'1day': { label: '24-Hour Pass', months: 0, days: 1, mmk: 3000 },
'1week': { label: '1 Week', months: 0, days: 7, mmk: 9900 },
'1month': { label: '1 Month', months: 1, mmk: 60000 },
'6months': { label: '6 Months', months: 6, mmk: 299000 },
'1year': { label: '1 Year', months: 12, mmk: 499000 },
};
export const PLAN_IDS = ['1day', '1week', '1month', '6months', '1year'];
/** Taster plans: scores, weak points and skin results only. No plan, no measurement table, no AI morph. */
export const LITE_TIERS = ['1day', '1week'];
/** Full plans: everything, including the AI morph. */
export const PAID_TIERS = PLAN_IDS.filter(id => !LITE_TIERS.includes(id));

/* ---------- launch promo ---------- */
export const PROMO_ENDS = new Date('2027-02-01T00:00:00+06:30'); // 1 Feb 2027, Myanmar time
export const PROMO_LABEL = 'Launch promo';
const PROMO_MMK: Record<string, number> = { '1day': 3000, '1week': 9900, '1month': 39000, '6months': 179000, '1year': 299000 };

/** First-month deal for 48 hours after the free trial ends. Must stay below the 1 Month price. */
const OFFER_NORMAL = 39000;
const OFFER_PROMO = 29000;

export const promoActive = (now: number = Date.now()) => now < PROMO_ENDS.getTime();

/** What a plan costs today in MMK (promo price while the promo runs). */
export const planMmk = (planId: string) => {
const p = PLANS[planId] ?? PLANS['1month'];
return promoActive() ? PROMO_MMK[planId] ?? p.mmk : p.mmk;
};
/** The normal price, shown crossed out during the promo. */
export const regularMmk = (planId: string) => (PLANS[planId] ?? PLANS['1month']).mmk;
/** Trial-ending deal price in MMK. */
export const trialOfferMmk = () => (promoActive() ? OFFER_PROMO : OFFER_NORMAL);
/** e.g. 35 for 35% off. */
export const percentOff = (now: number, was: number) => Math.round((1 - now / was) * 100);

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

/** Price of a plan in the chosen currency today. offer = the trial-ending deal (1 Month only). */
export const planPrice = (planId: string, c: Currency, rate: number = THB_TO_MMK, offer = false) => {
const mmk = offer && planId === '1month' ? trialOfferMmk() : planMmk(planId);
return c === 'THB' ? planThb(mmk, rate) : mmk;
};

