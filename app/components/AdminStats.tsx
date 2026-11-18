'use client';

// app/components/AdminStats.tsx — Admin -> Stats: where people quit, from opening the app to paying.
// Numbers come from admin_stats() in analytics.sql. Only the admin can load them.

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { planName } from '../../lib/payments';
import { Loader2, RefreshCw, TrendingDown } from 'lucide-react';

type Step = { n: number; label: string; people: number };
type Reason = { reason: string; n: number };
type PlanRow = { plan: string; picked: number; sent: number; approved: number };
type Stats = {
days: number;
funnel: Step[];
signup_errors: Reason[];
scan_fails: Reason[];
plans: PlanRow[];
shop: { picks_seen: number; pick_open: number; gallery_locked: number; morph_try: number };
};

const SIGNUP_REASONS: Record<string, string> = {
username: 'Username too short',
phone: 'Phone number wrong or missing',
gender: 'Did not pick gender',
password: 'Password too short',
not_18: 'Did not tick 18+',
email_typo: 'Mistyped email (we offered a fix)',
email_blocked: 'Throwaway email',
email_format: 'Broken email address',
already_registered: 'Already had an account',
rate_limit: 'Too many tries (Supabase limit)',
email_rejected: 'Email refused by Supabase',
server_error: 'Server error',
};
const SCAN_REASONS: Record<string, string> = {
under_18: 'AI thought they were under 18',
NO_FACE: 'No face found',
NOT_FRONTAL: 'Face turned, not looking straight',
EXPRESSION: 'Smiling / mouth open / eyes closed',
TOO_CLOSE: 'Too close to the camera',
TOO_SMALL: 'Face too small / far away',
LOAD_FAILED: 'Face model did not load (internet)',
IMAGE_FAILED: 'Photo could not be read',
unknown: 'Other',
};

const card: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function AdminStats() {
const [days, setDays] = useState(7);
const [stats, setStats] = useState<Stats | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const load = useCallback(async () => {
setLoading(true);
setError('');
const { data, error: err } = await supabase.rpc('admin_stats', { p_days: days });
if (err) {
console.error('admin_stats', err);
setError('Could not load stats. Did you run analytics.sql?');
} else setStats(data as Stats);
setLoading(false);
}, [days]);

useEffect(() => {
load();
}, [load]);

const funnel = stats?.funnel ?? [];
const top = Math.max(1, ...funnel.map(s => s.people));
// the biggest drop between two steps (only where there were at least 3 people before it)
let worst = -1;
let worstLoss = 0;
funnel.forEach((s, i) => {
if (i === 0) return;
const before = funnel[i - 1].people;
if (before < 3) return;
const loss = 1 - s.people / before;
if (loss > worstLoss) {
worstLoss = loss;
worst = i;
}
});

return (
<div className="space-y-4">
<div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={card}>
<div className="flex gap-1.5">
{[
[1, 'Today'],
[7, '7 days'],
[30, '30 days'],
].map(([d, label]) => (
<button
key={d}
onClick={() => setDays(d as number)}
className="text-[12px] rounded-full px-3.5 py-2"
style={{
background: days === d ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: days === d ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: days === d ? 600 : 400,
}}
>
{label}
</button>
))}
</div>
<button onClick={load} aria-label="Refresh" className="text-[rgb(var(--muted-hover))]">
{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
</button>
</div>

{error && (
<p className="text-center text-xs" style={{ color: 'rgb(var(--err))' }}>
{error}
</p>
)}

{stats && (
<>
{/* ---------- funnel ---------- */}
<div className="rounded-2xl p-5" style={card}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-1">From opening the app to paying</span>
<p className="text-[11px] text-[rgb(var(--muted))] mb-4">People at each step. The % is how many of the step above made it here.</p>
<div className="space-y-3">
{funnel.map((s, i) => {
const prev = i > 0 ? funnel[i - 1].people : 0;
const isWorst = i === worst;
return (
<div key={s.n}>
<div className="flex items-center justify-between text-[12px] mb-1">
<span className={isWorst ? 'text-[rgb(var(--gold))] font-semibold' : 'text-[rgb(var(--muted-hover))]'}>
{s.n}. {s.label}
</span>
<span className="font-display text-[rgb(var(--gold))]">
{s.people.toLocaleString('en-US')}
{i > 0 && prev > 0 && (
<span className="text-[10px] font-body ml-1.5" style={{ color: isWorst ? 'rgb(var(--err))' : 'rgb(var(--muted))' }}>
{pct(s.people, prev)}%
</span>
)}
</span>
</div>
<div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.12)' }}>
<div
className="h-full rounded-full"
style={{ width: `${Math.max(2, (s.people / top) * 100)}%`, background: isWorst ? 'rgb(var(--err))' : 'rgb(var(--gold))' }}
/>
</div>
</div>
);
})}
</div>
{worst > 0 && (
<div className="mt-5 rounded-xl p-3 flex items-start gap-2 text-[12px]" style={{ background: 'rgb(var(--err) / 0.08)', border: '1px solid rgb(var(--err) / 0.25)' }}>
<TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--err))' }} />
<span className="text-[rgb(var(--muted-hover))]">
Biggest drop: <b className="text-[rgb(var(--gold))]">{funnel[worst - 1].label}</b> → <b className="text-[rgb(var(--gold))]">{funnel[worst].label}</b>.{' '}
{Math.round(worstLoss * 100)}% of people stop here. Fix this step first.
</span>
</div>
)}
<p className="text-[10px] text-[rgb(var(--muted))] mt-4 leading-relaxed">
Steps 1–2 count phones, the rest count accounts. Steps 3, 5, 10 and 11 come straight from your database; the others only
started counting when you installed analytics.
</p>
</div>

{/* ---------- plans ---------- */}
<div className="rounded-2xl p-5" style={card}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">Plans: tapped vs paid</span>
<div className="grid grid-cols-4 text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide pb-2" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.12)' }}>
<span>Plan</span>
<span className="text-right">Tapped</span>
<span className="text-right">Sent</span>
<span className="text-right">Paid</span>
</div>
{stats.plans.map(p => (
<div key={p.plan} className="grid grid-cols-4 text-[13px] py-2" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)' }}>
<span className="text-[rgb(var(--muted-hover))]">{planName(p.plan)}</span>
<span className="text-right text-[rgb(var(--muted-hover))]">{p.picked}</span>
<span className="text-right text-[rgb(var(--muted-hover))]">{p.sent}</span>
<span className="text-right font-semibold text-[rgb(var(--gold))]">{p.approved}</span>
</div>
))}
</div>

{/* ---------- why things fail ---------- */}
<ReasonList title="Why sign-ups were stopped" rows={stats.signup_errors} names={SIGNUP_REASONS} empty="No sign-up problems recorded." />
<ReasonList title="Why scans failed" rows={stats.scan_fails} names={SCAN_REASONS} empty="No failed scans recorded." />

{/* ---------- extras ---------- */}
<div className="rounded-2xl p-5 grid grid-cols-2 gap-3" style={card}>
{[
['Saw product picks', stats.shop.picks_seen],
['Opened a picked product', stats.shop.pick_open],
['Hit the locked gallery', stats.shop.gallery_locked],
['Tried the AI morph', stats.shop.morph_try],
].map(([label, n]) => (
<div key={label as string}>
<p className="font-display text-xl font-semibold text-[rgb(var(--gold))]">{Number(n).toLocaleString('en-US')}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">{label}</p>
</div>
))}
</div>
</>
)}
</div>
);
}

function ReasonList({ title, rows, names, empty }: { title: string; rows: Reason[]; names: Record<string, string>; empty: string }) {
const total = rows.reduce((a, r) => a + r.n, 0);
return (
<div className="rounded-2xl p-5" style={card}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">{title}</span>
{rows.length === 0 ? (
<p className="text-[12px] text-[rgb(var(--muted))]">{empty}</p>
) : (
<div className="space-y-2">
{rows.map(r => (
<div key={r.reason} className="flex items-center justify-between text-[13px]">
<span className="text-[rgb(var(--muted-hover))]">{names[r.reason] ?? r.reason}</span>
<span className="text-[rgb(var(--gold))]">
{r.n} <span className="text-[10px] text-[rgb(var(--muted))]">({pct(r.n, total)}%)</span>
</span>
</div>
))}
</div>
)}
</div>
);
}

