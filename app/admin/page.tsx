'use client';

// app/admin/page.tsx — phone-first admin: approve premium, track revenue and team split, review sellers.

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground } from '../../lib/theme';
import { Check, X, Crown, ShieldAlert, Wallet, Store, RefreshCw, Loader2, Users, Bell, Send } from 'lucide-react';

const ADMIN_USER_ID = '0ae23fa9-66ba-446d-8f3d-a06d49ee8760';

// Fixed prices in MMK (keep in sync with PremiumModal)
const PLANS: Record<string, { label: string; months: number; price: number }> = {
'1month': { label: '1 Month', months: 1, price: 60000 },
'6months': { label: '6 Months', months: 6, price: 299000 },
'1year': { label: '1 Year', months: 12, price: 499000 },
};

const TEAM = [
{ name: 'Lucifer', share: 0.3 },
{ name: 'Alex', share: 0.3 },
{ name: 'Htoo', share: 0.25 },
{ name: 'Alxi', share: 0.1 },
{ name: 'Business reserve', share: 0.05 },
];

type PremiumRequest = {
id: string;
user_id: string;
plan: string;
status: string;
created_at: string;
approved_at: string | null;
amount_mmk: number | null;
profiles: { username: string | null; email: string | null } | null;
};

type SellerApp = {
id: string;
created_at: string;
business_name: string;
contact: string;
category: string;
description: string;
link: string | null;
status: string;
};

const mmk = (n: number) => `${Math.round(n).toLocaleString('en-US')} MMK`;
const priceOf = (r: PremiumRequest) => r.amount_mmk ?? PLANS[r.plan]?.price ?? 0;
const paidAt = (r: PremiumRequest) => new Date(r.approved_at ?? r.created_at);

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.16)',
backdropFilter: 'blur(10px)',
};
const accentStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))',
border: '1px solid rgb(var(--gold) / 0.25)',
};
const primaryBtn: React.CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' };
const ghostBtn: React.CSSProperties = { background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' };

function timeAgo(iso: string) {
const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
if (mins < 1) return 'just now';
if (mins < 60) return `${mins} min ago`;
const h = Math.floor(mins / 60);
if (h < 24) return `${h}h ago`;
return `${Math.floor(h / 24)}d ago`;
}

export default function AdminPage() {
const router = useRouter();
const [checking, setChecking] = useState(true);
const [isAdmin, setIsAdmin] = useState(false);
const [tab, setTab] = useState<'approvals' | 'revenue' | 'sellers' | 'notify'>('approvals');
const [nTitle, setNTitle] = useState('');
const [nBody, setNBody] = useState('');
const [sending, setSending] = useState(false);
const [pending, setPending] = useState<PremiumRequest[]>([]);
const [approved, setApproved] = useState<PremiumRequest[]>([]);
const [sellers, setSellers] = useState<SellerApp[]>([]);
const [loading, setLoading] = useState(true);
const [busyId, setBusyId] = useState<string | null>(null);
const [msg, setMsg] = useState('');

const loadAll = useCallback(async () => {
setLoading(true);
const [p, a, s] = await Promise.all([
supabase
.from('premium_requests')
.select('id, user_id, plan, status, created_at, approved_at, amount_mmk, profiles(username, email)')
.eq('status', 'pending')
.order('created_at', { ascending: true }),
supabase
.from('premium_requests')
.select('id, user_id, plan, status, created_at, approved_at, amount_mmk, profiles(username, email)')
.eq('status', 'approved')
.order('created_at', { ascending: false }),
supabase
.from('seller_applications')
.select('id, created_at, business_name, contact, category, description, link, status')
.order('created_at', { ascending: false }),
]);
if (p.error) console.error('pending', p.error);
if (a.error) console.error('approved', a.error);
if (s.error) console.error('sellers', s.error);
setPending((p.data as unknown as PremiumRequest[]) ?? []);
setApproved((a.data as unknown as PremiumRequest[]) ?? []);
setSellers((s.data as unknown as SellerApp[]) ?? []);
setLoading(false);
}, []);

useEffect(() => {
const init = async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) {
router.push('/login');
return;
}
if (session.user.id !== ADMIN_USER_ID) {
setChecking(false);
return;
}
setIsAdmin(true);
setChecking(false);
await loadAll();
};
init();
}, [router, loadAll]);

const approve = async (req: PremiumRequest) => {
setBusyId(req.id);
setMsg('');
try {
const plan = PLANS[req.plan] ?? PLANS['1month'];
// Renewals add on top of any time still left
const { data: prof } = await supabase
.from('profiles')
.select('subscription_expires_at')
.eq('id', req.user_id)
.single();
const current = prof?.subscription_expires_at ? new Date(prof.subscription_expires_at) : null;
const base = current && current.getTime() > Date.now() ? current : new Date();
const expiresAt = new Date(base);
expiresAt.setMonth(expiresAt.getMonth() + plan.months);

const { error: e1 } = await supabase
.from('profiles')
.update({ is_premium: true, subscription_tier: req.plan, subscription_expires_at: expiresAt.toISOString() })
.eq('id', req.user_id);
if (e1) throw e1;

const { error: e2 } = await supabase
.from('premium_requests')
.update({ status: 'approved', approved_at: new Date().toISOString(), amount_mmk: plan.price })
.eq('id', req.id);
if (e2) throw e2;

setMsg(`Approved ${req.profiles?.username ?? 'user'} until ${expiresAt.toLocaleDateString()}`);
await loadAll();
} catch (err) {
console.error('Approve failed:', err);
setMsg('Approve failed. Check you ran admin-onboarding.sql.');
} finally {
setBusyId(null);
}
};

const reject = async (req: PremiumRequest) => {
if (!confirm(`Reject ${req.profiles?.username ?? 'this request'}? Only do this if the payment did not arrive.`)) return;
setBusyId(req.id);
await supabase.from('premium_requests').update({ status: 'rejected' }).eq('id', req.id);
setBusyId(null);
await loadAll();
};

const setSellerStatus = async (app: SellerApp, status: 'approved' | 'rejected') => {
setBusyId(app.id);
const { error } = await supabase.from('seller_applications').update({ status }).eq('id', app.id);
if (error) setMsg('Could not update. Check you ran admin-onboarding.sql.');
setBusyId(null);
await loadAll();
};

const sendBroadcast = async () => {
if (!nTitle.trim() || !nBody.trim() || sending) return;
if (!confirm(`Send "${nTitle}" to everyone with notifications on?`)) return;
setSending(true);
setMsg('');
try {
const {
data: { session },
} = await supabase.auth.getSession();
const res = await fetch('/api/push/broadcast', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
body: JSON.stringify({ title: nTitle.trim(), body: nBody.trim() }),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
setMsg(`Sent to ${json.sent} of ${json.total} phones.`);
setNTitle('');
setNBody('');
} catch (e) {
setMsg(`Could not send: ${(e as Error).message}`);
} finally {
setSending(false);
}
};

/* ---------- revenue numbers ---------- */
const now = new Date();
const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const sum = (rows: PremiumRequest[]) => rows.reduce((s, r) => s + priceOf(r), 0);
const today = approved.filter(r => paidAt(r) >= startToday);
const month = approved.filter(r => paidAt(r) >= startMonth);
const totalAll = sum(approved);
const totalMonth = sum(month);
const totalToday = sum(today);
const byPlan = Object.keys(PLANS).map(k => ({
key: k,
label: PLANS[k].label,
count: approved.filter(r => r.plan === k).length,
money: sum(approved.filter(r => r.plan === k)),
}));
const pendingSellers = sellers.filter(s => s.status === 'pending');

if (checking) {
return (
<div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
<ThemeStyles />
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
);
}

if (!isAdmin) {
return (
<div className="min-h-screen bg-[rgb(var(--bg))] flex flex-col items-center justify-center gap-4 font-body">
<ThemeStyles />
<ShieldAlert className="w-8 h-8" style={{ color: 'rgb(var(--err))' }} />
<p className="text-sm" style={{ color: 'rgb(var(--err))' }}>Not authorized.</p>
</div>
);
}

const tabs = [
{ key: 'approvals' as const, label: 'Approvals', icon: Crown, badge: pending.length },
{ key: 'revenue' as const, label: 'Revenue', icon: Wallet, badge: 0 },
{ key: 'sellers' as const, label: 'Sellers', icon: Store, badge: pendingSellers.length },
{ key: 'notify' as const, label: 'Notify', icon: Bell, badge: 0 },
];

return (
<div className="min-h-screen bg-[rgb(var(--bg))] relative overflow-hidden font-body">
<ThemeStyles />
<MarbleBackground />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }
`}</style>
<div className="fixed right-4 z-40" style={{ top: 'max(calc(env(safe-area-inset-top) + 8px), 16px)' }}>
<ThemeToggle />
</div>

<div className="relative z-10 max-w-xl mx-auto px-4 pb-28" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 12px), 24px)' }}>
<div className="flex items-center justify-between mb-5 pr-12">
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block">Potentia</span>
<h1 className="font-display text-2xl font-semibold text-[rgb(var(--gold))]">Admin</h1>
</div>
<button onClick={loadAll} className="w-10 h-10 rounded-xl flex items-center justify-center" style={ghostBtn} aria-label="Refresh">
<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
</button>
</div>

{/* quick numbers */}
<div className="grid grid-cols-2 gap-3 mb-5">
<div className="rounded-2xl p-4" style={accentStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">Today</span>
<div className="font-display text-xl font-bold text-[rgb(var(--gold))] mt-1">{mmk(totalToday)}</div>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Pending</span>
<div className="font-display text-xl font-bold text-[rgb(var(--gold))] mt-1">{pending.length} to approve</div>
</div>
</div>

{msg && (
<p className="text-xs rounded-xl px-4 py-3 mb-4" style={{ ...cardStyle, color: 'rgb(var(--gold))' }}>
{msg}
</p>
)}

{/* ---------- approvals ---------- */}
{tab === 'approvals' && (
<div className="space-y-3">
<p className="text-[11px] text-[rgb(var(--muted))] px-1">
Check the payment arrived in your bank app, then approve. Renewals add on top of any time left.
</p>
{loading ? (
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))] mx-auto mt-8" />
) : pending.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<Check className="w-6 h-6 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">No pending requests.</p>
</div>
) : (
pending.map(req => {
const plan = PLANS[req.plan];
return (
<div key={req.id} className="rounded-2xl p-4" style={cardStyle}>
<div className="flex items-start justify-between gap-3 mb-4">
<div className="min-w-0">
<p className="text-base text-[rgb(var(--gold))] font-semibold truncate">
{req.profiles?.username || 'Unknown user'}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] truncate">{req.profiles?.email}</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-0.5">{timeAgo(req.created_at)}</p>
</div>
<div className="text-right flex-shrink-0">
<p className="text-sm text-[rgb(var(--muted-hover))]">{plan?.label ?? req.plan}</p>
<p className="font-display text-lg font-bold text-[rgb(var(--gold))]">{mmk(plan?.price ?? 0)}</p>
</div>
</div>
<div className="grid grid-cols-3 gap-2">
<button
onClick={() => reject(req)}
disabled={busyId === req.id}
className="flex items-center justify-center gap-1.5 text-sm rounded-xl py-3.5 disabled:opacity-50"
style={ghostBtn}
>
<X className="w-4 h-4" /> Reject
</button>
<button
onClick={() => approve(req)}
disabled={busyId === req.id}
className="col-span-2 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3.5 disabled:opacity-50"
style={primaryBtn}
>
{busyId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
Approve
</button>
</div>
</div>
);
})
)}
</div>
)}

{/* ---------- revenue ---------- */}
{tab === 'revenue' && (
<div className="space-y-4">
<div className="rounded-2xl p-5" style={accentStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">All time</span>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mt-1">{mmk(totalAll)}</div>
<div className="grid grid-cols-2 gap-3 mt-4">
<div>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">This month</span>
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{mmk(totalMonth)}</p>
</div>
<div>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">Payments</span>
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{approved.length}</p>
</div>
</div>
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Users className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Team split</span>
</div>
<div
className="grid grid-cols-3 text-[10px] uppercase tracking-wide text-[rgb(var(--muted))] pb-2 mb-1"
style={{ borderBottom: '1px solid rgb(var(--muted) / 0.15)' }}
>
<span>Member</span>
<span className="text-right">This month</span>
<span className="text-right">All time</span>
</div>
{TEAM.map(m => (
<div
key={m.name}
className="grid grid-cols-3 items-center py-2.5 text-sm"
style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)' }}
>
<span className="text-[rgb(var(--muted-hover))]">
{m.name} <span className="text-[rgb(var(--muted))] text-[11px]">{Math.round(m.share * 100)}%</span>
</span>
<span className="text-right font-display text-[rgb(var(--gold))]">{mmk(totalMonth * m.share)}</span>
<span className="text-right font-display text-[rgb(var(--gold))]">{mmk(totalAll * m.share)}</span>
</div>
))}
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">By plan</span>
{byPlan.map(p => (
<div key={p.key} className="flex items-center justify-between py-2 text-sm">
<span className="text-[rgb(var(--muted-hover))]">
{p.label} <span className="text-[rgb(var(--muted))]">× {p.count}</span>
</span>
<span className="font-display text-[rgb(var(--gold))]">{mmk(p.money)}</span>
</div>
))}
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">Recent payments</span>
{approved.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted))]">No payments yet.</p>
) : (
approved.slice(0, 20).map(r => (
<div
key={r.id}
className="flex items-center justify-between py-2 text-sm"
style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)' }}
>
<div className="min-w-0">
<p className="text-[rgb(var(--muted-hover))] truncate">{r.profiles?.username || 'Unknown'}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{PLANS[r.plan]?.label ?? r.plan} · {paidAt(r).toLocaleDateString()}
</p>
</div>
<span className="font-display text-[rgb(var(--gold))] flex-shrink-0">{mmk(priceOf(r))}</span>
</div>
))
)}
</div>
</div>
)}

{/* ---------- notify ---------- */}
{tab === 'notify' && (
<div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
<div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-1">Send to everyone</span>
<p className="text-xs text-[rgb(var(--muted-hover))]">
Goes to every phone with reminders turned on. Automatic streak and Sunday scan reminders already go out every day at 6pm.
</p>
</div>
<input
value={nTitle}
onChange={e => setNTitle(e.target.value)}
maxLength={80}
placeholder="Title, e.g. New challenge this week 🔥"
className="w-full rounded-xl px-4 py-3 bg-transparent text-[rgb(var(--gold))] focus:outline-none"
style={{ border: '1px solid rgb(var(--muted) / 0.25)', fontSize: 16 }}
/>
<textarea
value={nBody}
onChange={e => setNBody(e.target.value)}
maxLength={300}
rows={3}
placeholder="Message"
className="w-full rounded-xl px-4 py-3 bg-transparent text-[rgb(var(--gold))] focus:outline-none resize-none"
style={{ border: '1px solid rgb(var(--muted) / 0.25)', fontSize: 16 }}
/>
<button
onClick={sendBroadcast}
disabled={sending || !nTitle.trim() || !nBody.trim()}
className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3.5 disabled:opacity-40"
style={primaryBtn}
>
{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send notification
</button>
</div>
)}

{/* ---------- sellers ---------- */}
{tab === 'sellers' && (
<div className="space-y-3">
{sellers.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted-hover))]">No seller applications yet.</p>
</div>
) : (
sellers.map(app => (
<div key={app.id} className="rounded-2xl p-4" style={cardStyle}>
<div className="flex items-start justify-between gap-3 mb-2">
<div className="min-w-0">
<p className="text-base text-[rgb(var(--gold))] font-semibold">{app.business_name}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{app.category} · {timeAgo(app.created_at)}
</p>
</div>
<span
className="text-[10px] uppercase tracking-wide rounded-full px-2.5 py-1 flex-shrink-0"
style={{
background:
app.status === 'approved'
? 'rgb(var(--gold) / 0.15)'
: app.status === 'rejected'
? 'rgb(var(--err) / 0.12)'
: 'rgb(var(--muted) / 0.12)',
color:
app.status === 'approved'
? 'rgb(var(--gold))'
: app.status === 'rejected'
? 'rgb(var(--err))'
: 'rgb(var(--muted-hover))',
}}
>
{app.status}
</span>
</div>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-2">{app.description}</p>
<p className="text-xs text-[rgb(var(--gold))] break-all">Contact: {app.contact}</p>
{app.link && <p className="text-xs text-[rgb(var(--muted))] break-all mt-0.5">{app.link}</p>}
{app.status === 'pending' && (
<div className="grid grid-cols-3 gap-2 mt-4">
<button
onClick={() => setSellerStatus(app, 'rejected')}
disabled={busyId === app.id}
className="flex items-center justify-center gap-1.5 text-sm rounded-xl py-3 disabled:opacity-50"
style={ghostBtn}
>
<X className="w-4 h-4" /> Reject
</button>
<button
onClick={() => setSellerStatus(app, 'approved')}
disabled={busyId === app.id}
className="col-span-2 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 disabled:opacity-50"
style={primaryBtn}
>
<Check className="w-4 h-4" /> Approve
</button>
</div>
)}
</div>
))
)}
</div>
)}
</div>

{/* bottom tabs, thumb-friendly */}
<nav
className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl"
style={{
background: 'rgb(var(--bg) / 0.9)',
borderTop: '1px solid rgb(var(--gold) / 0.12)',
paddingBottom: 'env(safe-area-inset-bottom)',
}}
>
<div className="max-w-xl mx-auto grid grid-cols-4">
{tabs.map(({ key, label, icon: Icon, badge }) => {
const active = tab === key;
return (
<button key={key} onClick={() => setTab(key)} className="relative flex flex-col items-center gap-1 py-3">
<Icon className="w-5 h-5" style={{ color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }} />
<span className="text-[11px]" style={{ color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }}>
{label}
</span>
{badge > 0 && (
<span
className="absolute top-1.5 right-[calc(50%-22px)] min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
style={primaryBtn}
>
{badge}
</span>
)}
</button>
);
})}
</div>
</nav>
</div>
);
}

