'use client';

// app/admin/page.tsx — phone-first admin: approve premium, shop orders, revenue + team split, sellers, notifications.

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground } from '../../lib/theme';
import { Check, X, Crown, ShieldAlert, Wallet, Store, RefreshCw, Loader2, Users, Bell, Send, ShoppingBag, Phone, MapPin, Eye, EyeOff, ReceiptText, Flag } from 'lucide-react';
import { PLANS, COMMISSION, fmt, fmtMMK, toMMK, planPrice, type Currency } from '../../lib/payments';
import { getThbRate, resetThbRate } from '../../lib/fx';
import { SURVEY_REASONS } from '../components/TrialSurvey';
import { notify } from '../../lib/notify';

const ADMIN_USER_ID = '0ae23fa9-66ba-446d-8f3d-a06d49ee8760';


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
currency: Currency | null;
amount_paid: number | null;
fx_rate: number | null;
promo: string | null;
proof_path: string | null;
profiles: { username: string | null; email: string | null } | null;
};

type TrialRow = { id: string; subscription_tier: string | null; subscription_expires_at: string | null; trial_used_at: string };

type Order = {
id: string;
seller_id: string;
shop_name: string;
product_name: string;
qty: number;
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
proof_path: string | null;
pay_to: 'potentia' | 'seller' | null;
commission_mmk: number | null;
cancel_reason: string | null;
disputed: boolean | null;
dispute_note: string | null;
};

type Bill = {
id: string;
seller_id: string;
shop_name: string;
month: string;
orders_count: number;
sales_mmk: number;
commission_mmk: number;
due_at: string;
status: 'unpaid' | 'pending' | 'paid' | 'waived';
currency: Currency;
proof_path: string | null;
note: string | null;
submitted_at: string | null;
paid_at: string | null;
};
const monthName = (m: string) => new Date(`${m.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

type AdminProduct = {
id: string;
shop_name: string;
name: string;
price_mmk: number;
image_url: string | null;
active: boolean;
hidden_by_admin: boolean;
};

type SellerApp = {
id: string;
user_id: string;
created_at: string;
business_name: string;
contact: string;
category: string;
description: string;
link: string | null;
status: string;
};

const mmk = fmtMMK;
const curOf = (r: PremiumRequest): Currency => (r.currency === 'THB' ? 'THB' : 'MMK');
const priceOf = (r: PremiumRequest) => r.amount_mmk ?? toMMK(planPrice(r.plan, curOf(r)), curOf(r), r.fx_rate ?? undefined);
/** What the user was asked to pay (worked out by the server when they sent the request). */
const dueOf = (r: PremiumRequest) => (r.amount_paid != null ? Number(r.amount_paid) : planPrice(r.plan, curOf(r)));
const SOLD = ['paid', 'shipped', 'completed'];
const orderPaidAt = (o: Order) => new Date(o.paid_at ?? o.created_at);
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
const [tab, setTab] = useState<'approvals' | 'orders' | 'revenue' | 'sellers' | 'notify'>('approvals');
const [orders, setOrders] = useState<Order[]>([]);
const [bills, setBills] = useState<Bill[]>([]);
const [products, setProducts] = useState<AdminProduct[]>([]);
const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
const [viewing, setViewing] = useState<string | null>(null);
const [trials, setTrials] = useState<TrialRow[]>([]);
const [blockedTrials, setBlockedTrials] = useState(0);
const [feedback, setFeedback] = useState<{ reason: string; note: string | null; created_at: string }[]>([]);
const [rate, setRate] = useState('');
const [savingRate, setSavingRate] = useState(false);
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
const [p, a, s, o, pr, bl] = await Promise.all([
supabase
.from('premium_requests')
.select('id, user_id, plan, status, created_at, approved_at, amount_mmk, amount_paid, fx_rate, promo, currency, proof_path, profiles(username, email)')
.eq('status', 'pending')
.order('created_at', { ascending: true }),
supabase
.from('premium_requests')
.select('id, user_id, plan, status, created_at, approved_at, amount_mmk, amount_paid, fx_rate, promo, currency, proof_path, profiles(username, email)')
.eq('status', 'approved')
.order('created_at', { ascending: false }),
supabase
.from('seller_applications')
.select('id, user_id, created_at, business_name, contact, category, description, link, status')
.order('created_at', { ascending: false }),
supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
supabase
.from('products')
.select('id, shop_name, name, price_mmk, image_url, active, hidden_by_admin')
.order('created_at', { ascending: false })
.limit(300),
supabase.from('seller_bills').select('*').order('month', { ascending: false }).limit(300),
]);
if (bl.error) console.error('bills', bl.error);
const billsData = (bl.data as unknown as Bill[]) ?? [];
setBills(billsData);
if (o.error) console.error('orders', o.error);
if (pr.error) console.error('products', pr.error);
const ordersData = (o.data as unknown as Order[]) ?? [];
setOrders(ordersData);
setProducts((pr.data as unknown as AdminProduct[]) ?? []);

// Payment screenshots are private: get short-lived links for the ones waiting to be checked
const pendingReqs = (p.data as unknown as PremiumRequest[]) ?? [];
const paths = [
...pendingReqs.map(r => r.proof_path),
...ordersData.filter(x => x.status === 'pending' || x.disputed).map(x => x.proof_path),
...billsData.filter(x => x.status === 'pending').map(x => x.proof_path),
].filter((x): x is string => !!x);
if (paths.length) {
const { data: signed, error: signErr } = await supabase.storage.from('payment-proofs').createSignedUrls(paths, 3600);
if (signErr) console.error('proof links', signErr);
const map: Record<string, string> = {};
((signed ?? []) as { path: string | null; signedUrl: string }[]).forEach(x => {
if (x.path && x.signedUrl) map[x.path] = x.signedUrl;
});
setProofUrls(map);
} else {
setProofUrls({});
}

const { data: tr, error: trErr } = await supabase
.from('profiles')
.select('id, subscription_tier, subscription_expires_at, trial_used_at')
.not('trial_used_at', 'is', null);
if (trErr) console.error('trials', trErr);
setTrials((tr as unknown as TrialRow[]) ?? []);

const [{ count: blocked }, { data: fb }, r] = await Promise.all([
supabase.from('trial_claims').select('id', { count: 'exact', head: true }).eq('blocked', true),
supabase.from('trial_feedback').select('reason, note, created_at').order('created_at', { ascending: false }).limit(200),
getThbRate(),
]);
setBlockedTrials(blocked ?? 0);
setFeedback((fb as { reason: string; note: string | null; created_at: string }[]) ?? []);
setRate(String(r));
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
const cur = curOf(req);
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
.update({
status: 'approved',
approved_at: new Date().toISOString(),
amount_mmk: req.amount_mmk ?? toMMK(dueOf(req), cur, req.fx_rate ?? undefined),
amount_paid: dueOf(req),
})
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
else if (status === 'approved') notify('seller_approved', app.id);
setBusyId(null);
await loadAll();
};

const setOrderStatus = async (o: Order, status: 'paid' | 'cancelled' | 'completed') => {
if (status === 'cancelled' && !confirm(`Cancel ${o.buyer_name}'s order? Only do this if the money did not arrive.`)) return;
setBusyId(o.id);
setMsg('');
const patch: Record<string, unknown> = { status };
if (status === 'paid') patch.paid_at = new Date().toISOString();
const { error } = await supabase.from('orders').update(patch).eq('id', o.id);
if (error) setMsg('Could not update the order. Did you run marketplace.sql?');
else if (status === 'paid') {
notify('order_paid', o.id);
setMsg(`Confirmed. ${o.shop_name} was told to ship ${o.product_name}.`);
}
setBusyId(null);
await loadAll();
};

const payOutSeller = async (sellerId: string, shop: string, amount: number) => {
if (!confirm(`Mark ${mmk(amount)} as paid to ${shop}? Do this after you have sent them the money.`)) return;
setBusyId(sellerId);
const { error } = await supabase
.from('orders')
.update({ payout_status: 'paid', paid_out_at: new Date().toISOString() })
.eq('seller_id', sellerId)
.eq('payout_status', 'unpaid')
.in('status', ['shipped', 'completed']);
setMsg(error ? 'Could not mark as paid.' : `Marked ${mmk(amount)} paid to ${shop}.`);
setBusyId(null);
await loadAll();
};

const makeBills = async () => {
if (!confirm("Make last month's bills for every seller now? (It also happens automatically on the 1st.)")) return;
setBusyId('make-bills');
const { data, error } = await supabase.rpc('make_seller_bills');
setBusyId(null);
setMsg(error ? `Could not make bills: ${error.message}` : `Made ${data ?? 0} new bill(s).`);
await loadAll();
};

const setBillStatus = async (b: Bill, status: 'paid' | 'unpaid' | 'waived') => {
let note: string | null = null;
if (status === 'unpaid') {
note = prompt('Why are you refusing it? The seller sees this.', 'Payment not received');
if (note === null) return;
}
if (status === 'waived' && !confirm(`Waive ${mmk(b.commission_mmk)} for ${b.shop_name}? They won't have to pay it.`)) return;
setBusyId(b.id);
const patch: Record<string, unknown> = { status, note };
if (status === 'paid') patch.paid_at = new Date().toISOString();
if (status === 'unpaid') patch.proof_path = null;
const { error } = await supabase.from('seller_bills').update(patch).eq('id', b.id);
setMsg(error ? 'Could not update the bill.' : status === 'paid' ? `Marked ${b.shop_name} as paid. Their shop is live.` : 'Updated.');
setBusyId(null);
await loadAll();
};

const clearDispute = async (o: Order) => {
setBusyId(o.id);
await supabase.from('orders').update({ disputed: false }).eq('id', o.id);
setBusyId(null);
await loadAll();
};

const toggleHidden = async (p: AdminProduct) => {
setBusyId(p.id);
await supabase.from('products').update({ hidden_by_admin: !p.hidden_by_admin }).eq('id', p.id);
setBusyId(null);
await loadAll();
};

const saveRate = async () => {
const v = Number(rate);
if (!(v > 10 && v < 10000)) return setMsg('Enter a real rate, e.g. 142.2');
setSavingRate(true);
const { error } = await supabase
.from('app_settings')
.upsert({ key: 'thb_rate', value: v, updated_at: new Date().toISOString() });
setSavingRate(false);
if (error) return setMsg('Could not save the rate. Did you run nov1.sql?');
resetThbRate(v);
setMsg(`Saved. 1 THB = ${v} MMK. Thai prices updated for everyone.`);
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
// Shop: old orders (paid to Potentia) count 20% straight away;
// new orders (paid to the seller) count when the seller pays their monthly bill.
const soldOrders = orders.filter(o => SOLD.includes(o.status));
const legacySold = soldOrders.filter(o => o.pay_to !== 'seller');
const shopCut = (rows: Order[]) => rows.reduce((s, o) => s + o.total_mmk * COMMISSION, 0);
const paidBills = bills.filter(b => b.status === 'paid');
const billSum = (rows: Bill[]) => rows.reduce((s, b) => s + Number(b.commission_mmk), 0);
const billPaidAt = (b: Bill) => new Date(b.paid_at ?? b.submitted_at ?? b.due_at);
const shopAll = shopCut(legacySold) + billSum(paidBills);
const shopMonth = shopCut(legacySold.filter(o => orderPaidAt(o) >= startMonth)) + billSum(paidBills.filter(b => billPaidAt(b) >= startMonth));
const shopToday = shopCut(legacySold.filter(o => orderPaidAt(o) >= startToday)) + billSum(paidBills.filter(b => billPaidAt(b) >= startToday));
const pendingBills = bills.filter(b => b.status === 'pending');
const unpaidBills = bills.filter(b => b.status === 'unpaid');
const disputes = orders.filter(o => o.disputed);
// Potentia's 20% from orders paid to sellers this month (not billed yet)
const accruing = orders
.filter(o => o.pay_to === 'seller' && SOLD.includes(o.status) && orderPaidAt(o) >= startMonth)
.reduce((s, o) => s + (o.commission_mmk ?? o.total_mmk * COMMISSION), 0);
const premiumAll = sum(approved);
const premiumMonth = sum(month);
const totalAll = premiumAll + shopAll;
const totalMonth = premiumMonth + shopMonth;
const totalToday = sum(today) + shopToday;
// only old orders paid to Potentia need you; new ones are checked by the seller
const pendingOrders = orders.filter(o => o.status === 'pending' && o.pay_to !== 'seller');
const paidUserIds = new Set(approved.map(r => r.user_id));
const trialsActive = trials.filter(
x => x.subscription_tier === 'trial' && x.subscription_expires_at && new Date(x.subscription_expires_at).getTime() > Date.now(),
).length;
const trialsConverted = trials.filter(x => paidUserIds.has(x.id)).length;

const ProofThumb = ({ path }: { path: string | null }) => {
const url = path ? proofUrls[path] : null;
if (!path) {
return (
<div className="rounded-xl px-3 py-2.5 mb-3 text-xs font-medium" style={{ background: 'rgb(var(--err) / 0.12)', color: 'rgb(var(--err))' }}>
⚠️ No payment screenshot. Check your bank very carefully.
</div>
);
}
return (
<button
onClick={() => url && setViewing(url)}
className="w-full flex items-center gap-3 rounded-xl p-2 mb-3 text-left"
style={{ background: 'rgb(var(--muted) / 0.08)', border: '1px solid rgb(var(--muted) / 0.18)' }}
>
{url ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={url} alt="Payment proof" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
) : (
<div className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: 'rgb(var(--muted) / 0.15)' }} />
)}
<span className="text-xs text-[rgb(var(--muted-hover))]">
<span className="block text-[rgb(var(--gold))] font-medium">Payment screenshot</span>
Tap to view full size. Still check your bank app before approving.
</span>
</button>
);
};
const toShip = orders.filter(o => o.status === 'paid');
// what each seller is owed (80% of shipped orders not paid out yet)
const owedBySeller = Object.values(
orders
.filter(o => o.pay_to !== 'seller' && (o.status === 'shipped' || o.status === 'completed') && o.payout_status === 'unpaid')
.reduce<Record<string, { seller_id: string; shop: string; amount: number; count: number }>>((acc, o) => {
const k = o.seller_id;
acc[k] = acc[k] ?? { seller_id: k, shop: o.shop_name, amount: 0, count: 0 };
acc[k].amount += o.total_mmk * (1 - COMMISSION);
acc[k].count += 1;
return acc;
}, {}),
);
const sellerContact = (uid: string) => sellers.find(s => s.user_id === uid && s.status === 'approved')?.contact ?? '';
const byPlan = Object.keys(PLANS).map(k => ({
key: k,
label: PLANS[k].label,
count: approved.filter(r => r.plan === k).length,
money: sum(approved.filter(r => r.plan === k)),
thb: approved.filter(r => r.plan === k && curOf(r) === 'THB').length,
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
{ key: 'approvals' as const, label: 'Premium', icon: Crown, badge: pending.length },
{ key: 'orders' as const, label: 'Orders', icon: ShoppingBag, badge: pendingOrders.length },
{ key: 'revenue' as const, label: 'Revenue', icon: Wallet, badge: 0 },
{ key: 'sellers' as const, label: 'Sellers', icon: Store, badge: pendingSellers.length + pendingBills.length + disputes.length },
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
<div className="relative z-10 max-w-xl mx-auto px-4 pb-28" style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 16px), 56px)' }}>
<div className="flex items-center justify-between mb-5">
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block">Potentia</span>
<h1 className="font-display text-2xl font-semibold text-[rgb(var(--gold))]">Admin</h1>
</div>
<div className="flex items-center gap-2">
<ThemeToggle />
<button onClick={loadAll} className="w-10 h-10 rounded-xl flex items-center justify-center" style={ghostBtn} aria-label="Refresh">
<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
</button>
</div>
</div>

{/* quick numbers */}
<div className="grid grid-cols-2 gap-3 mb-5">
<div className="rounded-2xl p-4" style={accentStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">Today</span>
<div className="font-display text-xl font-bold text-[rgb(var(--gold))] mt-1">{mmk(totalToday)}</div>
</div>
<div className="rounded-2xl p-4" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Pending</span>
<div className="font-display text-xl font-bold text-[rgb(var(--gold))] mt-1">
{pending.length + pendingOrders.length + pendingBills.length + disputes.length} to check
</div>
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
Check the payment arrived in the right bank app (Myanmar or Thai), then approve. Renewals add on top of any time left.
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
const cur = curOf(req);
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
{req.promo === 'trial_offer' && (
<p className="text-[10px] font-bold text-[rgb(var(--gold))] uppercase tracking-wide">🎁 Trial offer</p>
)}
<p className="font-display text-lg font-bold text-[rgb(var(--gold))]">{fmt(dueOf(req), cur)}</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{cur === 'THB' ? '🇹🇭 Thai bank' : '🇲🇲 Myanmar bank'}</p>
</div>
</div>
<ProofThumb path={req.proof_path} />
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
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">Thai baht rate</span>
<div className="flex items-center gap-2">
<span className="text-sm text-[rgb(var(--muted-hover))] whitespace-nowrap">1 THB =</span>
<input
value={rate}
onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ''))}
inputMode="decimal"
className="flex-1 min-w-0 rounded-xl px-3 py-2.5 bg-transparent text-[rgb(var(--gold))] font-display text-lg focus:outline-none"
style={{ border: '1px solid rgb(var(--muted) / 0.25)', fontSize: 18 }}
/>
<span className="text-sm text-[rgb(var(--muted-hover))]">MMK</span>
<button
onClick={saveRate}
disabled={savingRate}
className="text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-50"
style={primaryBtn}
>
{savingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
</button>
</div>
{Number(rate) > 10 && (
<p className="text-[11px] text-[rgb(var(--muted))] mt-2">
Thai prices now: 1 Month {planPrice('1month', 'THB', Number(rate))} · 6 Months {planPrice('6months', 'THB', Number(rate))} · 1 Year{' '}
{planPrice('1year', 'THB', Number(rate))} · Trial offer {planPrice('1month', 'THB', Number(rate), true)} THB
</p>
)}
</div>

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
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{approved.length + soldOrders.length}</p>
</div>
<div>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">Premium</span>
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{mmk(premiumAll)}</p>
</div>
<div>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">Shop 20%</span>
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{mmk(shopAll)}</p>
</div>
<div className="col-span-2">
<span className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">Shop 20% building up this month (billed on the 1st)</span>
<p className="font-display text-base font-semibold text-[rgb(var(--gold))]">{mmk(accruing)}</p>
</div>
</div>
<p className="text-[10px] text-[rgb(var(--muted))] mt-3">Thai baht payments are counted at 1 THB = 138.7 MMK.</p>
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
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">Free trials</span>
<div className="grid grid-cols-3 gap-3 text-center">
<div>
<p className="font-display text-xl font-bold text-[rgb(var(--gold))]">{trials.length}</p>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase">Started</span>
</div>
<div>
<p className="font-display text-xl font-bold text-[rgb(var(--gold))]">{trialsActive}</p>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase">On trial now</span>
</div>
<div>
<p className="font-display text-xl font-bold text-[rgb(var(--gold))]">{trialsConverted}</p>
<span className="text-[10px] text-[rgb(var(--muted))] uppercase">Then paid</span>
</div>
</div>
<p className="text-[11px] text-[rgb(var(--muted))] mt-3">
🛡️ Blocked repeat trials (same phone): <span className="text-[rgb(var(--gold))] font-semibold">{blockedTrials}</span>
</p>
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">
Why trials didn&apos;t buy ({feedback.length} answers)
</span>
{feedback.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted))]">No answers yet.</p>
) : (
<>
{SURVEY_REASONS.map(o => {
const n = feedback.filter(f => f.reason === o.id).length;
const pct = Math.round((n / feedback.length) * 100);
return (
<div key={o.id} className="mb-2.5">
<div className="flex justify-between text-xs mb-1">
<span className="text-[rgb(var(--muted-hover))]">
{o.emoji} {o.label}
</span>
<span className="text-[rgb(var(--gold))] font-semibold">
{n} · {pct}%
</span>
</div>
<div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'rgb(var(--gold))' }} />
</div>
</div>
);
})}
{feedback.filter(f => f.note).slice(0, 8).map(f => (
<p key={f.created_at} className="text-[11px] text-[rgb(var(--muted-hover))] italic mt-2">“{f.note}”</p>
))}
</>
)}
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">By plan</span>
{byPlan.map(p => (
<div key={p.key} className="flex items-center justify-between py-2 text-sm">
<span className="text-[rgb(var(--muted-hover))]">
{p.label} <span className="text-[rgb(var(--muted))]">× {p.count}{p.thb > 0 ? ` (${p.thb} 🇹🇭)` : ''}</span>
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
{curOf(r) === 'THB' ? ` · ${fmt(dueOf(r), 'THB')}` : ''}{r.promo === 'trial_offer' ? ' · 🎁 offer' : ''}
</p>
</div>
<span className="font-display text-[rgb(var(--gold))] flex-shrink-0">{mmk(priceOf(r))}</span>
</div>
))
)}
</div>
</div>
)}

{/* ---------- shop orders ---------- */}
{tab === 'orders' && (
<div className="space-y-4">
<div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block px-1 mb-2">
Check payment ({pendingOrders.length})
</span>
{pendingOrders.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<Check className="w-5 h-5 mx-auto mb-1 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">No orders waiting.</p>
</div>
) : (
<div className="space-y-3">
{pendingOrders.map(o => (
<div key={o.id} className="rounded-2xl p-4" style={cardStyle}>
<div className="flex items-start justify-between gap-3 mb-3">
<div className="min-w-0">
<p className="text-base text-[rgb(var(--gold))] font-semibold">{o.buyer_name}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{o.qty} × {o.product_name} · {o.shop_name}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">{timeAgo(o.created_at)}</p>
</div>
<div className="text-right flex-shrink-0">
<p className="font-display text-lg font-bold text-[rgb(var(--gold))]">{fmt(o.amount_due, o.currency)}</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{o.currency === 'THB' ? '🇹🇭 Thai bank' : '🇲🇲 Myanmar bank'}</p>
</div>
</div>
<ProofThumb path={o.proof_path} />
<div className="grid grid-cols-3 gap-2">
<button
onClick={() => setOrderStatus(o, 'cancelled')}
disabled={busyId === o.id}
className="flex items-center justify-center gap-1.5 text-sm rounded-xl py-3.5 disabled:opacity-50"
style={ghostBtn}
>
<X className="w-4 h-4" /> Cancel
</button>
<button
onClick={() => setOrderStatus(o, 'paid')}
disabled={busyId === o.id}
className="col-span-2 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3.5 disabled:opacity-50"
style={primaryBtn}
>
{busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
Money arrived
</button>
</div>
</div>
))}
</div>
)}
</div>

{owedBySeller.length > 0 && (
<div className="rounded-2xl p-5" style={accentStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-3">Pay sellers (their 80%)</span>
{owedBySeller.map(s => (
<div key={s.seller_id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.1)' }}>
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--muted-hover))] font-medium truncate">{s.shop}</p>
<p className="text-[11px] text-[rgb(var(--muted))] truncate">
{s.count} orders · {sellerContact(s.seller_id)}
</p>
</div>
<button
onClick={() => payOutSeller(s.seller_id, s.shop, s.amount)}
disabled={busyId === s.seller_id}
className="flex-shrink-0 text-xs font-semibold rounded-xl px-3 py-2.5 disabled:opacity-50"
style={primaryBtn}
>
Paid {mmk(s.amount)}
</button>
</div>
))}
</div>
)}

{toShip.length > 0 && (
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">Waiting for seller to ship</span>
{toShip.map(o => (
<div key={o.id} className="py-2" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)' }}>
<p className="text-sm text-[rgb(var(--muted-hover))]">
{o.qty} × {o.product_name} <span className="text-[rgb(var(--muted))]">· {o.shop_name}</span>
</p>
<p className="text-[11px] text-[rgb(var(--muted))] flex items-center gap-1.5">
<Phone className="w-3 h-3" /> {o.buyer_name} {o.buyer_phone}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] flex items-start gap-1.5">
<MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {o.buyer_address}
</p>
{o.paid_at && <p className="text-[10px] text-[rgb(var(--muted))]">paid {timeAgo(o.paid_at)}</p>}
</div>
))}
</div>
)}

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">All orders</span>
{orders.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted))]">No orders yet.</p>
) : (
orders.slice(0, 30).map(o => (
<div key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)' }}>
<div className="min-w-0">
<p className="text-[rgb(var(--muted-hover))] truncate">
{o.qty} × {o.product_name}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{o.shop_name} · {o.status}
{o.pay_to === 'seller' ? ' · paid to seller' : o.payout_status === 'paid' ? ' · seller paid' : ''}
{o.disputed ? ' · ⚠️ reported' : ''}
</p>
</div>
<div className="text-right flex-shrink-0">
<p className="font-display text-[rgb(var(--gold))]">{fmt(o.amount_due, o.currency)}</p>
{SOLD.includes(o.status) && <p className="text-[10px] text-[rgb(var(--muted))]">we keep {mmk(o.total_mmk * COMMISSION)}</p>}
</div>
</div>
))
)}
</div>

<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-1">Products ({products.length})</span>
<p className="text-[11px] text-[rgb(var(--muted))] mb-3">Hide anything fake, unsafe or against the rules.</p>
{products.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted))]">No products yet.</p>
) : (
products.map(p => (
<div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.08)', opacity: p.hidden_by_admin ? 0.5 : 1 }}>
{p.image_url ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
) : (
<div className="w-11 h-11 rounded-lg flex-shrink-0" style={{ background: 'rgb(var(--muted) / 0.1)' }} />
)}
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--muted-hover))] truncate">{p.name}</p>
<p className="text-[11px] text-[rgb(var(--muted))] truncate">
{p.shop_name} · {mmk(p.price_mmk)}
{!p.active ? ' · paused' : ''}
</p>
</div>
<button
onClick={() => toggleHidden(p)}
disabled={busyId === p.id}
className="flex-shrink-0 flex items-center gap-1 text-[11px] rounded-lg px-2.5 py-2 disabled:opacity-50"
style={p.hidden_by_admin ? primaryBtn : ghostBtn}
>
{p.hidden_by_admin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
{p.hidden_by_admin ? 'Show' : 'Hide'}
</button>
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
{/* ---- monthly bills (Potentia's 20%) ---- */}
<div className="rounded-2xl p-5" style={accentStyle}>
<div className="flex items-center justify-between gap-3 mb-1">
<span className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">
<ReceiptText className="w-4 h-4" /> Seller bills
</span>
<button
onClick={makeBills}
disabled={busyId === 'make-bills'}
className="text-[11px] font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
style={ghostBtn}
>
{busyId === 'make-bills' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Make last month's bills"}
</button>
</div>
<p className="text-[11px] text-[rgb(var(--muted))] mb-3">
Made automatically on the 1st, due the 7th. Late sellers&apos; products hide by themselves until they pay.
</p>

{pendingBills.length > 0 && (
<div className="space-y-3 mb-3">
{pendingBills.map(b => (
<div key={b.id} className="rounded-xl p-3" style={cardStyle}>
<div className="flex items-start justify-between gap-3 mb-2">
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-semibold truncate">{b.shop_name}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{monthName(b.month)} · {b.orders_count} orders · sales {mmk(b.sales_mmk)}
</p>
</div>
<div className="text-right flex-shrink-0">
<p className="font-display text-lg font-bold text-[rgb(var(--gold))]">{mmk(b.commission_mmk)}</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{b.currency === 'THB' ? '🇹🇭 Thai bank' : '🇲🇲 Myanmar bank'}</p>
</div>
</div>
<ProofThumb path={b.proof_path} />
<div className="grid grid-cols-3 gap-2">
<button
onClick={() => setBillStatus(b, 'unpaid')}
disabled={busyId === b.id}
className="flex items-center justify-center gap-1.5 text-sm rounded-xl py-3 disabled:opacity-50"
style={ghostBtn}
>
<X className="w-4 h-4" /> Refuse
</button>
<button
onClick={() => setBillStatus(b, 'paid')}
disabled={busyId === b.id}
className="col-span-2 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl py-3 disabled:opacity-50"
style={primaryBtn}
>
{busyId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Money arrived
</button>
</div>
</div>
))}
</div>
)}

{unpaidBills.length === 0 && pendingBills.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted-hover))]">Nobody owes you right now.</p>
) : (
unpaidBills.map(b => {
const late = new Date(b.due_at).getTime() < Date.now();
return (
<div key={b.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.1)' }}>
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--muted-hover))] font-medium truncate">{b.shop_name}</p>
<p className="text-[11px] truncate" style={{ color: late ? 'rgb(var(--err))' : 'rgb(var(--muted))' }}>
{monthName(b.month)} · {late ? 'OVERDUE · shop hidden' : `due ${new Date(b.due_at).toLocaleDateString()}`} · {sellerContact(b.seller_id)}
</p>
</div>
<div className="flex items-center gap-2 flex-shrink-0">
<span className="font-display text-sm text-[rgb(var(--gold))]">{mmk(b.commission_mmk)}</span>
<button onClick={() => setBillStatus(b, 'waived')} disabled={busyId === b.id} className="text-[10px] rounded-lg px-2 py-1.5" style={ghostBtn}>
Waive
</button>
</div>
</div>
);
})
)}

{paidBills.length > 0 && (
<p className="text-[11px] text-[rgb(var(--muted))] mt-3">
Collected from sellers so far: <span className="text-[rgb(var(--gold))] font-semibold">{mmk(billSum(paidBills))}</span>
</p>
)}
</div>

{/* ---- buyer reports ---- */}
{disputes.length > 0 && (
<div className="rounded-2xl p-5" style={{ ...cardStyle, border: '1px solid rgb(var(--err) / 0.35)' }}>
<span className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: 'rgb(var(--err))' }}>
<Flag className="w-4 h-4" /> Buyer reports ({disputes.length})
</span>
{disputes.map(o => (
<div key={o.id} className="py-3" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.1)' }}>
<p className="text-sm text-[rgb(var(--muted-hover))]">
{o.qty} × {o.product_name} <span className="text-[rgb(var(--muted))]">· {o.shop_name} · {o.status}</span>
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
Buyer {o.buyer_name} {o.buyer_phone} · seller {sellerContact(o.seller_id)} · {fmt(o.amount_due, o.currency)}
</p>
{o.cancel_reason && <p className="text-[11px] text-[rgb(var(--muted))]">Seller said: “{o.cancel_reason}”</p>}
{o.dispute_note && <p className="text-[11px] text-[rgb(var(--gold))]">Buyer says: “{o.dispute_note}”</p>}
<div className="mt-2">
<ProofThumb path={o.proof_path} />
</div>
<button onClick={() => clearDispute(o)} disabled={busyId === o.id} className="text-[11px] rounded-lg px-3 py-2" style={ghostBtn}>
Mark as sorted
</button>
</div>
))}
</div>
)}

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

{viewing && (
<button
onClick={() => setViewing(null)}
className="fixed inset-0 z-[60] flex items-center justify-center p-4"
style={{ background: 'rgb(0 0 0 / 0.92)' }}
aria-label="Close"
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={viewing} alt="Payment proof" className="max-w-full max-h-full object-contain rounded-xl" />
<span className="absolute top-12 right-5 text-white text-sm rounded-full px-3 py-1.5" style={{ background: 'rgb(255 255 255 / 0.15)' }}>
Close ✕
</span>
</button>
)}

{/* bottom tabs, thumb-friendly */}
<nav
className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl"
style={{
background: 'rgb(var(--bg) / 0.9)',
borderTop: '1px solid rgb(var(--gold) / 0.12)',
paddingBottom: 'env(safe-area-inset-bottom)',
}}
>
<div className="max-w-xl mx-auto grid grid-cols-5">
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

