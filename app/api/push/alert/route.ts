// app/api/push/alert/route.ts — sends the right notification when something happens:
// new premium payment / new order -> you (admin), order confirmed -> seller + buyer,
// order shipped -> buyer, seller approved -> seller.
// The server checks the database itself, so nobody can use this to spam people.

import { adminDb, sendTo, ADMIN_USER_ID, type Sub, type Message } from '../../../../lib/pushServer';
import { PLANS, fmt, type Currency } from '../../../../lib/payments';

export const dynamic = 'force-dynamic';

async function pushUser(userId: string, msg: Message) {
const db = adminDb();
const { data } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').eq('user_id', userId);
let sent = 0;
for (const sub of (data ?? []) as Sub[]) if (await sendTo(sub, msg)) sent++;
return sent;
}

const recent = (iso: string) => Date.now() - new Date(iso).getTime() < 30 * 60 * 1000;

type Order = {
id: string;
buyer_id: string;
seller_id: string;
product_name: string;
qty: number;
total_mmk: number;
currency: Currency;
amount_due: number;
status: string;
created_at: string;
paid_at: string | null;
shipped_at: string | null;
};

export async function POST(req: Request) {
const token = req.headers.get('authorization')?.replace('Bearer ', '');
if (!token) return new Response('Unauthorized', { status: 401 });

const db = adminDb();
const { data: who } = await db.auth.getUser(token);
const me = who?.user?.id;
if (!me) return new Response('Unauthorized', { status: 401 });

const { event, id } = (await req.json().catch(() => ({}))) as { event?: string; id?: string };
if (!event || !id) return Response.json({ error: 'event and id required' }, { status: 400 });

try {
if (event === 'premium_request') {
const { data: r } = await db
.from('premium_requests')
.select('user_id, plan, status, currency, created_at')
.eq('id', id)
.single();
if (!r || r.user_id !== me || r.status !== 'pending' || !recent(r.created_at)) return Response.json({ sent: 0 });
const { data: p } = await db.from('profiles').select('username').eq('id', me).single();
const plan = PLANS[r.plan] ?? PLANS['1month'];
const cur = (r.currency as Currency) ?? 'MMK';
const sent = await pushUser(ADMIN_USER_ID, {
title: '💳 New Premium payment',
body: `${p?.username ?? 'Someone'} · ${plan.label} · ${fmt(cur === 'THB' ? plan.thb : plan.mmk, cur)}. Check your ${cur === 'THB' ? 'Thai' : 'Myanmar'} bank, then approve.`,
url: '/admin',
});
return Response.json({ sent });
}

if (event === 'seller_approved') {
if (me !== ADMIN_USER_ID) return new Response('Forbidden', { status: 403 });
const { data: a } = await db.from('seller_applications').select('user_id, status').eq('id', id).single();
if (!a || a.status !== 'approved') return Response.json({ sent: 0 });
const sent = await pushUser(a.user_id, {
title: "You're approved to sell 🎉",
body: 'Open the Shop tab and add your first product.\nရောင်းချခွင့် ရပါပြီ။ Shop ထဲမှာ ပစ္စည်း စတင်ထည့်ပါ။',
url: '/?tab=marketplace',
});
return Response.json({ sent });
}

// order events
const { data: o } = await db
.from('orders')
.select('id, buyer_id, seller_id, product_name, qty, total_mmk, currency, amount_due, status, created_at, paid_at, shipped_at')
.eq('id', id)
.single();
const order = o as Order | null;
if (!order) return Response.json({ sent: 0 });

if (event === 'order_placed') {
if (order.buyer_id !== me || order.status !== 'pending' || !recent(order.created_at)) return Response.json({ sent: 0 });
const sent = await pushUser(ADMIN_USER_ID, {
title: '🛍️ New shop order',
body: `${order.qty} × ${order.product_name} · ${fmt(order.amount_due, order.currency)}. Check the payment, then confirm.`,
url: '/admin',
});
return Response.json({ sent });
}

if (event === 'order_paid') {
if (me !== ADMIN_USER_ID || order.status !== 'paid') return Response.json({ sent: 0 });
const a = await pushUser(order.seller_id, {
title: '📦 New order to ship',
body: `${order.qty} × ${order.product_name} is paid. Open your shop to see the address.\nငွေချေပြီးပါပြီ။ ပို့ရန် လိပ်စာကို Shop ထဲမှာ ကြည့်ပါ။`,
url: '/?tab=marketplace',
});
const b = await pushUser(order.buyer_id, {
title: 'Payment confirmed ✅',
body: `Your order for ${order.product_name} is confirmed. The seller will ship it soon.\nငွေလက်ခံရရှိပါပြီ။ မကြာခင် ပို့ပေးပါမယ်။`,
url: '/?tab=marketplace',
});
return Response.json({ sent: a + b });
}

if (event === 'order_shipped') {
if (order.seller_id !== me || order.status !== 'shipped') return Response.json({ sent: 0 });
const sent = await pushUser(order.buyer_id, {
title: 'Your order is on the way 🚚',
body: `${order.product_name} has been shipped.\nသင့်ပစ္စည်း ပို့လိုက်ပါပြီ။`,
url: '/?tab=marketplace',
});
return Response.json({ sent });
}

return Response.json({ error: 'Unknown event' }, { status: 400 });
} catch (e) {
console.error('alert failed', e);
return Response.json({ error: (e as Error).message }, { status: 500 });
}
}

