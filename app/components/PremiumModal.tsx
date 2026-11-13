'use client';

// app/components/PremiumModal.tsx — pick a plan, pick a bank (Myanmar or Thai), scan the QR, tell us you paid.

import React, { useEffect, useState } from 'react';
import { X, Crown, Loader2, Check, Gift } from 'lucide-react';
import ProofUpload from './ProofUpload';
import { useLang } from '../../lib/i18n';
import {
PLANS,
PLAN_IDS,
LITE_TIERS,
BANKS,
fmt,
fmtMMK,
fmtTHB,
planPrice,
planThb,
planMmk,
regularMmk,
trialOfferMmk,
promoActive,
percentOff,
PROMO_ENDS,
type Currency,
} from '../../lib/payments';
import { useThbRate } from '../../lib/fx';
import { applyAffiliateCode, checkAffiliateCode, cleanCode, savedAffiliate } from '../../lib/affiliate';
import { PAYMENT_HOURS, PAYMENT_SPEED } from '../../lib/brand';

type PremiumModalProps = {
onClose: () => void;
onConfirm: (plan: string, currency: Currency, proofPath: string, promo?: 'trial_offer') => void;
/** the first-month deal right after the free trial ends */
offer?: boolean;
submitting: boolean;
/** Shown only to people who have never used their free trial */
onStartTrial?: () => void;
startingTrial?: boolean;
};

const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };

export function QrBox({ src }: { src: string }) {
const [missing, setMissing] = useState(false);
return (
<div className="w-full aspect-square bg-white flex items-center justify-center rounded-2xl overflow-hidden">
{missing ? (
<span style={{ color: '#999', fontSize: 12, padding: 16, textAlign: 'center' }}>
QR not found. Add {src.replace('/', '')} to your public folder.
</span>
) : (
// eslint-disable-next-line @next/next/no-img-element
<img key={src} src={src} alt="Payment QR code" className="w-full h-full object-contain" onError={() => setMissing(true)} />
)}
</div>
);
}

export function BankPicker({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
const { t } = useLang();
return (
<div className="grid grid-cols-2 gap-2">
{BANKS.map(b => {
const active = value === b.id;
return (
<button
key={b.id}
type="button"
onClick={() => onChange(b.id)}
className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] transition-all"
style={{
background: active ? 'rgb(var(--gold) / 0.12)' : 'rgb(var(--surface) / 0.5)',
border: `1px solid ${active ? 'rgb(var(--gold) / 0.65)' : 'rgb(var(--muted) / 0.2)'}`,
color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
<span className="text-base">{b.flag}</span> {t(b.label)}
</button>
);
})}
</div>
);
}

export default function PremiumModal({ onClose, onConfirm, submitting, onStartTrial, startingTrial, offer = false }: PremiumModalProps) {
const rate = useThbRate();
const { t, lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
// The scan result's "Unlock for 24 hours" button asks for the 24-Hour Pass to be picked already.
const [selectedPlan, setSelectedPlan] = useState(() => {
try {
const want = sessionStorage.getItem('potentia_plan');
sessionStorage.removeItem('potentia_plan');
if (want && PLANS[want]) return want;
} catch {
/* ignore */
}
return '1month';
});
// affiliate code (optional). Pre-filled if they opened an affiliate's link.
const [affCode, setAffCode] = useState(savedAffiliate());
const [affName, setAffName] = useState<string | null>(null);
const [affError, setAffError] = useState('');
const [sending, setSending] = useState(false);
useEffect(() => {
const c = cleanCode(affCode);
setAffError('');
if (c.length < 3) return setAffName(null);
const id = setTimeout(async () => setAffName(await checkAffiliateCode(c)), 400);
return () => clearTimeout(id);
}, [affCode]);

const sendPayment = async () => {
if (!proofPath || sending) return;
const c = cleanCode(affCode);
if (c) {
setSending(true);
const res = await applyAffiliateCode(c);
setSending(false);
if (res === 'invalid') return setAffError(L('That code does not exist. Check it or leave it empty.', 'ဒီကုဒ် မရှိပါ။ ပြန်စစ်ပါ (သို့) အလွတ်ထားပါ။'));
if (res === 'own') return setAffError(L('You cannot use your own code.', 'ကိုယ့်ကုဒ်ကို ကိုယ်တိုင် သုံးလို့ မရပါ။'));
// 'already' = they are linked to someone else already: keep going, nothing changes
}
onConfirm(selectedPlan, currency, proofPath, useOffer ? 'trial_offer' : undefined);
};
const [currency, setCurrency] = useState<Currency>('MMK');
const [step, setStep] = useState<'select' | 'pay'>('select');
const [proofPath, setProofPath] = useState<string | null>(null);

const plan = PLANS[selectedPlan];
const useOffer = offer && selectedPlan === '1month';
const bank = BANKS.find(b => b.id === currency)!;

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
<span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
<Crown className="w-4 h-4 text-[rgb(var(--gold))]" />
</span>
<span className="font-display text-sm tracking-[0.15em] text-[rgb(var(--gold))] uppercase">{t('Go Premium')}</span>
</div>

{step === 'select' ? (
<>
{onStartTrial && (
<button
onClick={onStartTrial}
disabled={startingTrial}
className="w-full flex items-center gap-3 rounded-2xl p-4 mb-5 text-left disabled:opacity-60"
style={{ background: 'linear-gradient(135deg, rgb(var(--gold) / 0.22), rgb(var(--gold) / 0.06))', border: '1px solid rgb(var(--gold) / 0.6)' }}
>
<span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--gold))' }}>
{startingTrial ? (
<Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--bg))' }} />
) : (
<Gift className="w-5 h-5" style={{ color: 'rgb(var(--bg))' }} />
)}
</span>
<span>
<span className="block text-sm font-semibold text-[rgb(var(--gold))]">{t('Try Premium free for 7 days')}</span>
<span className="block text-[11px] text-[rgb(var(--muted-hover))]">{t('No payment needed. It ends by itself.')}</span>
</span>
</button>
)}
{offer && (
<div
className="rounded-2xl p-4 mb-5"
style={{ background: 'linear-gradient(135deg, rgb(var(--gold) / 0.25), rgb(var(--gold) / 0.06))', border: '1px solid rgb(var(--gold) / 0.7)' }}
>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase font-bold block mb-1">🎁 {t('Trial offer · 48 hours only')}</span>
<span className="text-sm text-[rgb(var(--muted-hover))]">
{t('Your first month for {price} instead of {old}.', { price: fmtMMK(trialOfferMmk()), old: fmtMMK(planMmk('1month')) })}
</span>
</div>
)}
{promoActive() && !offer && (
<div
className="rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3"
style={{ background: 'linear-gradient(135deg, rgb(var(--gold) / 0.22), rgb(var(--gold) / 0.05))', border: '1px solid rgb(var(--gold) / 0.6)' }}
>
<span className="text-[11px] tracking-[0.15em] text-[rgb(var(--gold))] uppercase font-bold">🔥 {t('Launch promo')}</span>
<span className="text-[11px] text-[rgb(var(--muted-hover))]">
{t('Until {date}', { date: PROMO_ENDS.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yangon' }) })}
</span>
</div>
)}
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
{t('Unlimited scans, full measurement tables and all weak-point reports. Choose your plan.')}
</p>
<div className="space-y-3 mb-7">
{PLAN_IDS.map(id => {
const p = PLANS[id];
const active = selectedPlan === id;
const was = regularMmk(id);
const now = offer && id === '1month' ? trialOfferMmk() : planMmk(id);
const off = percentOff(now, was);
return (
<button
key={id}
onClick={() => setSelectedPlan(id)}
className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left"
style={{
background: active ? 'rgb(var(--gold) / 0.1)' : 'rgb(var(--surface) / 0.5)',
border: `1px solid ${active ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.18)'}`,
boxShadow: active ? '0 0 16px rgb(var(--gold) / 0.15)' : 'none',
}}
>
<div>
<div className="flex items-center gap-2 mb-0.5">
<span className="text-sm text-[rgb(var(--gold))] font-medium">{id === '1day' ? L('24-Hour Pass', '၂၄ နာရီ Pass') : id === '1week' ? L('1 Week', '၁ ပတ်') : t(p.label)}</span>
{id === '1day' && (
<span className="text-[9px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'rgb(var(--gold) / 0.15)', color: 'rgb(var(--gold))' }}>
{L('Cheapest', 'ဈေးအသက်သာဆုံး')}
</span>
)}
{id === '1week' && (
<span className="text-[9px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'rgb(var(--gold) / 0.15)', color: 'rgb(var(--gold))' }}>
{L('Try it', 'စမ်းကြည့်ရန်')}
</span>
)}
{off > 0 && (
<span
className="text-[9px] font-bold rounded-full px-2 py-0.5"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
-{off}%
</span>
)}
</div>
{now < was ? (
<span className="block">
<s className="text-[11px] text-[rgb(var(--muted))] opacity-70">{fmtMMK(was)}</s>
<span className="block text-sm text-[rgb(var(--gold))] font-bold">
{fmtMMK(now)} <span className="text-[11px] font-normal text-[rgb(var(--muted))]">· {fmtTHB(planThb(now, rate))}</span>
</span>
</span>
) : (
<span className="text-xs text-[rgb(var(--muted))]">
{fmtMMK(now)} · {fmtTHB(planThb(now, rate))}
</span>
)}
<span className="block text-[10px] text-[rgb(var(--muted))] mt-0.5 leading-relaxed">
{LITE_TIERS.includes(id)
? L(
'A taste: unlimited scans, all weak points, skin results, potential score. No plan, no AI morph.',
'အစမ်း: scan အကန့်အသတ်မရှိ၊ အားနည်းချက်အားလုံး၊ အသားအရေ ရလဒ်၊ potential အမှတ်။ Plan နဲ့ AI morph မပါပါ။'
)
: L(
'Everything: your full plan, what to do for your skin, all measurements, AI morph.',
'အားလုံးပါ: သင့်အတွက် plan အပြည့်အစုံ၊ အသားအရေအတွက် လုပ်ရမယ့်အရာ၊ တိုင်းတာချက်အားလုံး၊ AI morph။'
)}
</span>
</div>
{active && <Check className="w-4 h-4 text-[rgb(var(--gold))] flex-shrink-0" />}
</button>
);
})}
</div>
<button onClick={() => setStep('pay')} className="w-full font-medium py-3.5 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
{t('Continue')}
</button>
</>
) : (
<>
<span className="text-[11px] text-[rgb(var(--muted))] block mb-2">{t('Which bank will you pay from?')}</span>
<div className="mb-4">
<BankPicker value={currency} onChange={setCurrency} />
</div>

<p className="text-sm text-[rgb(var(--muted-hover))] mb-4 leading-relaxed">
{t('Scan with your banking app to pay for the {plan} plan. Once done, tap "I\'ve Sent Payment" below.', { plan: t(plan.label) })}
</p>

<div className="mb-4">
<QrBox src={bank.qr} />
</div>

<p className="text-center text-xs text-[rgb(var(--muted))] mb-5">
{t('Amount')}:{' '}
<span className="text-[rgb(var(--gold))] font-semibold text-sm">{fmt(planPrice(selectedPlan, currency, rate, useOffer), currency)}</span>
</p>

<div className="mb-5">
<ProofUpload onChange={setProofPath} />
</div>

<div className="mb-5">
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{L('Affiliate code (optional)', 'Affiliate ကုဒ် (မထည့်လည်းရ)')}</label>
<input
value={affCode}
onChange={e => setAffCode(cleanCode(e.target.value))}
placeholder="HTOO"
autoCapitalize="characters"
autoCorrect="off"
spellCheck={false}
className="w-full rounded-xl px-4 py-3 bg-transparent text-[rgb(var(--gold))] tracking-[0.15em] focus:outline-none"
style={{ border: '1px solid rgb(var(--muted) / 0.25)', fontSize: 16 }}
/>
{affName && !affError && (
<p className="text-[11px] text-[rgb(var(--gold))] mt-1.5 flex items-center gap-1">
<Check className="w-3.5 h-3.5" /> {L(`Code from ${affName}`, `${affName} ၏ ကုဒ်`)}
</p>
)}
{affError && <p className="text-[11px] mt-1.5" style={{ color: 'rgb(var(--err))' }}>{affError}</p>}
</div>

<button
onClick={sendPayment}
disabled={submitting || sending || !proofPath}
className="w-full flex items-center justify-center gap-2 disabled:opacity-50 font-medium py-3.5 rounded-xl text-[13px] tracking-wide"
style={primaryBtn}
>
{submitting || sending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("I've Sent Payment")}
</button>
<p className="text-center text-[11px] text-[rgb(var(--gold))] mt-3">
⚡ {L(
`Usually confirmed ${PAYMENT_SPEED.en} (${PAYMENT_HOURS.en}).`,
`ပုံမှန်အားဖြင့် ${PAYMENT_SPEED.my} အတည်ပြုပေးပါတယ် (${PAYMENT_HOURS.my})။`
)}
</p>
<p className="text-center text-[11px] text-[rgb(var(--muted))] mt-2">
{t('By paying you agree to our')}{' '}
<a href="/terms" target="_blank" className="underline underline-offset-2">
{t('Terms of Use')}
</a>
</p>

<button onClick={() => setStep('select')} className="w-full text-center text-xs text-[rgb(var(--muted))] mt-4">
{t('Back')}
</button>
</>
)}
</div>
</div>
);
}

