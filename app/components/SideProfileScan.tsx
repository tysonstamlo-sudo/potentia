'use client';

// app/components/SideProfileScan.tsx — automatic side profile reading (jawline, chin, neck, nose, lips, posture).
// One side photo -> AI reads it. Premium (including the free trial).

import { useRef, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { toAiImage, callAi, aiErrorText } from '../../lib/aiClient';
import { Sheet, cardStyle, primaryBtn } from './shopShared';
import { Camera, ImageUp, Loader2, Crown, RefreshCw, CheckCircle2, ArrowUpRight } from 'lucide-react';

type Reading = {
valid: boolean;
reason?: string;
scores?: { jawline: number; chin: number; neck: number; nose: number; lips: number; posture: number };
details?: { gonial_angle_deg: number | null; chin_projection: string; forward_head: string; under_chin: string } | null;
strengths?: string[];
tips?: string[];
left?: number;
};

const WEIGHTS: Record<string, number> = { jawline: 1.4, chin: 1.2, neck: 1.0, nose: 0.8, lips: 0.6, posture: 0.8 };
const LABELS: Record<string, string> = {
jawline: 'Jawline',
chin: 'Chin',
neck: 'Neck & under-chin',
nose: 'Nose profile',
lips: 'Lips balance',
posture: 'Posture',
};

const sideScore = (s: NonNullable<Reading['scores']>) => {
const keys = Object.keys(WEIGHTS) as (keyof typeof s)[];
const w = keys.reduce((a, k) => a + WEIGHTS[k], 0);
return Math.round((keys.reduce((a, k) => a + s[k] * WEIGHTS[k], 0) / w) * 10) / 10;
};

function Silhouette() {
return (
<svg viewBox="0 0 120 140" className="w-28 h-32 mx-auto" fill="none">
<path
d="M70 18c-20 0-34 14-34 34 0 9 2 15 0 20-3 6-9 9-8 13 1 3 6 3 6 6 0 3-3 4-2 7 1 2 4 2 4 5 0 4-1 8 3 11 4 3 12 1 17 3 4 2 5 9 5 15h30V18H70z"
stroke="rgb(var(--gold))"
strokeWidth="2.5"
strokeLinejoin="round"
/>
<path d="M36 52h-6M30 72l-8-2" stroke="rgb(var(--gold) / 0.5)" strokeWidth="2" strokeLinecap="round" />
</svg>
);
}

export default function SideProfileScan({
isPremium,
onGoPremium,
onClose,
}: {
isPremium: boolean;
onGoPremium: () => void;
onClose: () => void;
}) {
const { t } = useLang();
const selfieRef = useRef<HTMLInputElement | null>(null);
const otherRef = useRef<HTMLInputElement | null>(null);
const [photo, setPhoto] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');
const [reading, setReading] = useState<Reading | null>(null);

const pick = async (file: File | undefined) => {
if (!file) return;
setBusy(true);
setError('');
setReading(null);
try {
const image = await toAiImage(file, 1024);
setPhoto(image);
const r = await callAi<Reading>('/api/ai/profile', { image });
if (!r.ok) return setError(t(aiErrorText(r.code)));
if (!r.data.valid) return setError(t(r.data.reason || 'Take a clear side photo'));
setReading(r.data);
} catch {
setError(t(aiErrorText('error')));
} finally {
setBusy(false);
if (selfieRef.current) selfieRef.current.value = '';
if (otherRef.current) otherRef.current.value = '';
}
};

const chip = (label: string, value: string) => (
<div className="rounded-xl px-3 py-2" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<span className="block text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{t(label)}</span>
<span className="text-sm text-[rgb(var(--gold))] font-medium capitalize">{t(value)}</span>
</div>
);

return (
<Sheet onClose={onClose} title={t('Side profile scan')}>
<input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => pick(e.target.files?.[0])} />
<input ref={otherRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />

{!isPremium ? (
<div className="rounded-3xl p-6 text-center" style={cardStyle}>
<Silhouette />
<Crown className="w-6 h-6 mx-auto mt-4 mb-2 text-[rgb(var(--gold))]" />
<p className="text-base text-[rgb(var(--gold))] font-semibold mb-1">{t('Side profile scan is Premium')}</p>
<p className="text-xs text-[rgb(var(--muted))] mb-5 leading-relaxed">
{t('Get your jawline, chin, neck, nose and posture scored from one side photo, with tips to improve.')}
</p>
<button onClick={onGoPremium} className="font-semibold py-3.5 px-8 rounded-xl text-sm" style={primaryBtn}>
{t('Go Premium')}
</button>
</div>
) : reading && reading.scores ? (
<div className="space-y-4">
<div className="rounded-3xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.14), rgb(var(--surface) / 0.5))', border: '1px solid rgb(var(--gold) / 0.35)' }}>
{photo && (
// eslint-disable-next-line @next/next/no-img-element
<img src={photo} alt="" className="w-24 h-32 rounded-2xl object-cover flex-shrink-0" />
)}
<div>
<span className="text-[10px] tracking-[0.25em] text-[rgb(var(--muted))] uppercase">{t('Side profile score')}</span>
<div className="font-display text-5xl font-bold text-[rgb(var(--gold))] leading-none mt-1">
{sideScore(reading.scores).toFixed(1)}
<span className="text-base font-normal text-[rgb(var(--muted))]">/10</span>
</div>
</div>
</div>

<div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
{(Object.keys(LABELS) as (keyof NonNullable<Reading['scores']>)[]).map(k => {
const v = reading.scores![k];
return (
<div key={k}>
<div className="flex justify-between text-sm mb-1">
<span className="text-[rgb(var(--muted-hover))]">{t(LABELS[k])}</span>
<span className="font-display font-semibold text-[rgb(var(--gold))]">{v.toFixed(1)}</span>
</div>
<div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full" style={{ width: `${v * 10}%`, background: 'rgb(var(--gold))' }} />
</div>
</div>
);
})}
</div>

{reading.details && (
<div className="grid grid-cols-2 gap-2">
{reading.details.gonial_angle_deg != null && chip('Jaw angle', `${Math.round(reading.details.gonial_angle_deg)}°`)}
{chip('Chin', reading.details.chin_projection)}
{chip('Head posture', reading.details.forward_head === 'none' ? 'good' : `${reading.details.forward_head} forward`)}
{chip('Under chin', reading.details.under_chin)}
</div>
)}

{!!reading.strengths?.length && (
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">{t('Strengths')}</span>
{reading.strengths.map(s => (
<p key={s} className="flex gap-2 text-sm text-[rgb(var(--muted-hover))] mb-2">
<CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[rgb(var(--gold))]" /> {s}
</p>
))}
</div>
)}

{!!reading.tips?.length && (
<div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.25)' }}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-3">{t('How to improve')}</span>
{reading.tips.map(s => (
<p key={s} className="flex gap-2 text-sm text-[rgb(var(--muted-hover))] mb-2">
<ArrowUpRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-[rgb(var(--gold))]" /> {s}
</p>
))}
</div>
)}

<button onClick={() => otherRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm" style={cardStyle}>
<RefreshCw className="w-4 h-4 text-[rgb(var(--gold))]" /> <span className="text-[rgb(var(--gold))]">{t('Scan again')}</span>
</button>
<p className="text-[10px] text-[rgb(var(--muted))] text-center">{t('AI reading from one photo. Lighting and angle change the result a little.')}</p>
</div>
) : (
<div>
<div className="rounded-3xl p-6 text-center mb-5" style={cardStyle}>
<Silhouette />
<p className="text-base text-[rgb(var(--gold))] font-semibold mt-4 mb-3">{t('Take one side photo')}</p>
<ul className="text-left text-xs text-[rgb(var(--muted-hover))] space-y-2 max-w-xs mx-auto">
<li>• {t('Turn your head fully to the side (90°), look straight ahead')}</li>
<li>• {t('Hair behind your ear, jaw and neck visible')}</li>
<li>• {t('Stand naturally, do not tense or lift your chin')}</li>
<li>• {t('Best if a friend takes it at face height')}</li>
</ul>
</div>
{busy ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<Loader2 className="w-7 h-7 mx-auto mb-3 animate-spin text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--gold))]">{t('Reading your side profile...')}</p>
</div>
) : (
<div className="grid grid-cols-2 gap-3">
<button onClick={() => otherRef.current?.click()} className="rounded-2xl py-5 flex flex-col items-center gap-2 text-sm font-semibold" style={primaryBtn}>
<ImageUp className="w-5 h-5" /> {t('Choose / take photo')}
</button>
<button onClick={() => selfieRef.current?.click()} className="rounded-2xl py-5 flex flex-col items-center gap-2 text-sm" style={cardStyle}>
<Camera className="w-5 h-5 text-[rgb(var(--gold))]" />
<span className="text-[rgb(var(--gold))]">{t('Selfie camera')}</span>
</button>
</div>
)}
{error && <p className="text-sm text-[rgb(var(--err))] mt-4 text-center">{error}</p>}
<p className="text-[10px] text-[rgb(var(--muted))] text-center mt-4 leading-relaxed">
{t('Your photo is sent to Google’s AI to read it and is not stored by Potentia.')}
</p>
</div>
)}
</Sheet>
);
}

