'use client';

// app/components/PremiumModal.tsx — pick a plan, pick a bank (Myanmar or Thai), scan the QR, tell us you paid.

import React, { useState } from 'react';
import { X, Crown, Loader2, Check, Gift } from 'lucide-react';
import ProofUpload from './ProofUpload';
import { useLang } from '../../lib/i18n';
import { PLANS, PLAN_IDS, BANKS, fmt, fmtMMK, fmtTHB, planPrice, type Currency } from '../../lib/payments';

type PremiumModalProps = {
onClose: () => void;
onConfirm: (plan: string, currency: Currency, proofPath: string) => void;
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

export default function PremiumModal({ onClose, onConfirm, submitting, onStartTrial, startingTrial }: PremiumModalProps) {
const { t } = useLang();
const [selectedPlan, setSelectedPlan] = useState('1month');
const [currency, setCurrency] = useState<Currency>('MMK');
const [step, setStep] = useState<'select' | 'pay'>('select');
const [proofPath, setProofPath] = useState<string | null>(null);

const plan = PLANS[selectedPlan];
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
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5 leading-relaxed">
{t('Unlimited scans, full measurement tables and all weak-point reports. Choose your plan.')}
</p>
<div className="space-y-3 mb-7">
{PLAN_IDS.map(id => {
const p = PLANS[id];
const active = selectedPlan === id;
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
<span className="text-sm text-[rgb(var(--gold))] font-medium">{t(p.label)}</span>
{p.note && (
<span className="text-[9px] text-[rgb(var(--gold))] rounded-full px-2 py-0.5" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
{t(p.note)}
</span>
)}
</div>
<span className="text-xs text-[rgb(var(--muted))]">
{fmtMMK(p.mmk)} · {fmtTHB(p.thb)}
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
<span className="text-[rgb(var(--gold))] font-semibold text-sm">{fmt(planPrice(selectedPlan, currency), currency)}</span>
</p>

<div className="mb-5">
<ProofUpload onChange={setProofPath} />
</div>

<button
onClick={() => proofPath && onConfirm(selectedPlan, currency, proofPath)}
disabled={submitting || !proofPath}
className="w-full flex items-center justify-center gap-2 disabled:opacity-50 font-medium py-3.5 rounded-xl text-[13px] tracking-wide"
style={primaryBtn}
>
{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("I've Sent Payment")}
</button>
<p className="text-center text-[11px] text-[rgb(var(--muted))] mt-3">
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

