'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { buildPlan, METRIC_LABEL, type PlanMeasurement, type Evidence } from '../../lib/improvementPlan';
import { X, Crown, Lock, Target, CheckCircle2, AlertTriangle, ScanFace, Loader2 } from 'lucide-react';
import { useLang } from '../../lib/i18n';

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

const accentCardStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.3))',
border: '1px solid rgb(var(--gold) / 0.22)',
backdropFilter: 'blur(10px)',
};

const EVIDENCE_LABEL: Record<Evidence, string> = {
solid: 'Strong evidence',
mixed: 'Mixed evidence',
weak: 'Weak evidence',
};

const CONTROL_LABEL = {
high: 'You can change this a lot',
medium: 'Partly changeable',
low: 'Mostly fixed, style around it',
} as const;

/** The plan itself. Used inside the scan result and in the full-plan modal. */
export function PlanView({ measurements }: { measurements: PlanMeasurement[] }) {
const { t } = useLang();
const plan = buildPlan(measurements);

return (
<div className="space-y-5">
{plan.focus.map((f, idx) => (
<div key={f.area} className="rounded-2xl p-5" style={idx === 0 ? accentCardStyle : cardStyle}>
<div className="flex items-start justify-between gap-3 mb-3">
<div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-1">
{t('Priority {n}', { n: idx + 1 })}
</span>
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{t(f.label)}</h3>
</div>
<div className="text-right flex-shrink-0">
<div className="font-display text-xl font-bold text-[rgb(var(--gold))]">{f.score.toFixed(1)}</div>
<div className="text-[10px] text-[rgb(var(--muted))]">{t("area score")}</div>
</div>
</div>

<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-1">{t(f.headline)}</p>
<p className="text-[11px] text-[rgb(var(--muted))] mb-4">{t(CONTROL_LABEL[f.controllability])}</p>

{f.weakest.length > 0 && (
<div className="flex flex-wrap gap-1.5 mb-4">
{f.weakest.map(k => (
<span
key={k}
className="text-[10px] rounded-full px-2.5 py-1"
style={{ background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }}
>
{t(METRIC_LABEL[k] ?? k)}
</span>
))}
</div>
)}

<div className="space-y-4">
{f.levers.map(l => (
<div key={l.id} className="rounded-xl p-4" style={{ background: 'rgb(var(--bg) / 0.35)' }}>
<div className="flex items-start justify-between gap-2 mb-1.5">
<h4 className="text-sm font-medium text-[rgb(var(--gold))]">{t(l.title)}</h4>
<span className="text-[9px] uppercase tracking-wide text-[rgb(var(--muted))] whitespace-nowrap mt-0.5">
{t(EVIDENCE_LABEL[l.evidence])}
</span>
</div>
<p className="text-xs text-[rgb(var(--muted))] leading-relaxed mb-3">{t(l.why)}</p>
<ul className="space-y-1.5">
{l.steps.map((s, i) => (
<li key={i} className="flex gap-2 text-xs text-[rgb(var(--muted-hover))] leading-relaxed">
<CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-px text-[rgb(var(--gold))]" />
<span>{t(s)}</span>
</li>
))}
</ul>
{l.caution && (
<div
className="flex gap-2 mt-3 rounded-lg p-3 text-[11px] leading-relaxed"
style={{ background: 'rgb(var(--err) / 0.1)', color: 'rgb(var(--err))' }}
>
<AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
<span>{t(l.caution)}</span>
</div>
)}
</div>
))}
</div>
</div>
))}

<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-2 mb-3">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Your routine")}</span>
</div>
<ul className="space-y-2">
{plan.routine.map((r, i) => (
<li key={i} className="flex gap-2 text-xs text-[rgb(var(--muted-hover))] leading-relaxed">
<CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-px text-[rgb(var(--gold))]" />
<span>{t(r)}</span>
</li>
))}
</ul>
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<h4 className="text-sm font-medium text-[rgb(var(--gold))] mb-1.5">{t(plan.baseline.title)}</h4>
<p className="text-xs text-[rgb(var(--muted))] leading-relaxed mb-3">{t(plan.baseline.why)}</p>
<ul className="space-y-1.5">
{plan.baseline.steps.map((s, i) => (
<li key={i} className="flex gap-2 text-xs text-[rgb(var(--muted-hover))] leading-relaxed">
<CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-px text-[rgb(var(--gold))]" />
<span>{t(s)}</span>
</li>
))}
</ul>
</div>

<p className="px-1 text-[11px] leading-relaxed text-[rgb(var(--muted))]">{t(plan.note)}</p>
</div>
);
}

type FullPlanModalProps = {
isPremium: boolean;
onClose: () => void;
onGoPremium: () => void;
onGoScan: () => void;
};

/** Full-screen "Full plan" view opened from the dashboard. Reads your latest scan. */
export default function FullPlanModal({ isPremium, onClose, onGoPremium, onGoScan }: FullPlanModalProps) {
const { t } = useLang();
const [loading, setLoading] = useState(true);
const [measurements, setMeasurements] = useState<PlanMeasurement[] | null>(null);
const [scanDate, setScanDate] = useState('');

const showFull = isPremium || process.env.NODE_ENV === 'development';

useEffect(() => {
const load = async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) {
setLoading(false);
return;
}
const { data } = await supabase
.from('scans')
.select('created_at, measurements')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1);
if (data && data[0]) {
setMeasurements(data[0].measurements as PlanMeasurement[]);
setScanDate(
new Date(data[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
);
}
setLoading(false);
};
load();
}, []);

return (
<div
className="fixed inset-0 z-50 overflow-y-auto font-body backdrop-blur-md"
style={{ background: 'rgb(var(--bg) / 0.96)' }}
>
<div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
<div className="flex items-center justify-between mb-5">
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">
{t("Your plan")}
</span>
<h2 className="font-display text-xl font-semibold text-[rgb(var(--gold))]">
Improvement plan{scanDate && <span className="text-xs font-normal text-[rgb(var(--muted))]"> · from {scanDate} scan</span>}
</h2>
</div>
<button
onClick={onClose}
aria-label="Close"
className="w-9 h-9 rounded-full flex items-center justify-center text-[rgb(var(--muted))]"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
>
<X className="w-4 h-4" />
</button>
</div>

{loading ? (
<div className="flex justify-center py-20">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : !measurements ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<ScanFace className="w-8 h-8 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">{t("Scan your face first")}</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
{t("Your plan is built from your scan. It targets your weakest measurements, like jaw, symmetry or proportions.")}
</p>
<button
onClick={() => {
onClose();
onGoScan();
}}
className="font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t("Go to Scan")}
</button>
</div>
) : showFull ? (
<PlanView measurements={measurements} />
) : (
<div className="rounded-2xl p-8 text-center" style={accentCardStyle}>
<Lock className="w-7 h-7 mx-auto mb-4 text-[rgb(var(--gold))]" />
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-2">
{t("Your personal plan is Premium")}
</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6">
{t('Premium turns your scan into a step-by-step plan. If your jaw is weak, you get jaw, posture and leanness work. If your symmetry is off, you get habits and styling for that instead.')}
</p>
<button
onClick={() => {
onClose();
onGoPremium();
}}
className="inline-flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Crown className="w-4 h-4" /> Go Premium
</button>
</div>
)}
</div>
</div>
);
}

