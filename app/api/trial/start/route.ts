// app/api/push/cron/route.ts — runs once a day at 6pm Myanmar time (set in vercel.json).
// Order of importance for each person:
// 1. free trial ending soon / just ended (with the first-month offer)
// 2. looks ranking place about to expire (no camera scan for almost 14 days)
// 3. Sunday weekly scan
// 4. streak reminder if today's tasks aren't done
// Plus the shop's monthly bills (Myanmar dates):
// 1st: make last month's bills (20% of each seller's confirmed sales) and tell each seller
// 5th and 7th: remind sellers who haven't paid
// 8th: tell late sellers their shop is hidden until they pay (the hiding itself is automatic)

import { adminDb, sendTo, ADMIN_USER_ID, type Sub, type Message } from '../../../../lib/pushServer';
import { trialOfferMmk, planMmk } from '../../../../lib/payments';

export const dynamic = 'force-dynamic';

const H = 3600 * 1000;
/** Scan at least this often to stay on the looks ranking (keep in sync with rank_days() in rank-expiry.sql). */
const RANK_DAYS = 14;
const toMyDigits = (s: string) => s.replace(/[0-9]/g, d => '၀၁၂၃၄၅၆၇၈၉'[Number(d)]);

export async function GET(req: Request) {
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with cron requests
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
return new Response('Unauthorized', { status: 401 });
}

const db = adminDb();

// ---- shop bills ----
let billing: Record<string, unknown> = {};
try {
billing = await shopBills(db);
} catch (e) {
console.error('shop bills failed', e);
billing = { error: (e as Error).message };
}

const { data: subs, error } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
if (error) return Response.json({ error: error.message }, { status: 500 });
if (!subs || subs.length === 0) return Response.json({ sent: 0, billing });

const userIds = Array.from(new Set((subs as Sub[]).map(s => s.user_id)));
const [{ data: profiles }, { data: requests }] = await Promise.all([
db
.from('profiles')
.select('id, username, last_active_date, current_streak, subscription_tier, subscription_expires_at, show_on_looks_board, looks_banned')
.in('id', userIds),
db.from('premium_requests').select('user_id, status').in('user_id', userIds).in('status', ['pending', 'approved']),
]);
type Prof = {
id: string;
username: string | null;
last_active_date: string | null;
current_streak: number | null;
subscription_tier: string | null;
subscription_expires_at: string | null;
show_on_looks_board: boolean | null;
looks_banned: boolean | null;
};
const byId = new Map<string, Prof>(((profiles ?? []) as Prof[]).map(p => [p.id, p]));
const paying = new Set(((requests ?? []) as { user_id: string }[]).map(r => r.user_id));

const now = Date.now();

// each person's latest camera scan (only recent ones matter for the ranking warning)
const lastScan = new Map<string, number>();
try {
const since = new Date(now - (RANK_DAYS + 1) * 24 * H).toISOString();
const { data: scans } = await db
.from('scans')
.select('user_id, created_at')
.in('user_id', userIds)
.or('source.is.null,source.neq.upload')
.not('overall', 'is', null)
.gt('created_at', since)
.order('created_at', { ascending: false })
.limit(20000);
for (const s of (scans ?? []) as { user_id: string; created_at: string }[]) {
if (!lastScan.has(s.user_id)) lastScan.set(s.user_id, new Date(s.created_at).getTime());
}
} catch (e) {
console.error('rank expiry lookup failed', e);
}

const today = new Date().toISOString().slice(0, 10); // the app uses UTC dates
const isSunday = new Date(now + 6.5 * H).getUTCDay() === 0; // Sunday in Myanmar

const offer = trialOfferMmk().toLocaleString('en-US');
const normal = planMmk('1month').toLocaleString('en-US');
const offerMy = toMyDigits(offer);

let sent = 0;
for (const sub of subs as Sub[]) {
const p = byId.get(sub.user_id);
if (!p) continue;
let msg: Message | null = null;

// 1. free trial
if (p.subscription_tier === 'trial' && p.subscription_expires_at && !paying.has(p.id)) {
const left = new Date(p.subscription_expires_at).getTime() - now;
if (left > 24 * H && left <= 48 * H) {
msg = {
title: '2 days left of your free Premium ⏳',
body: "Keep your full face report and plan. Go Premium before it ends.\nPremium အခမဲ့ ၂ ရက်သာ ကျန်ပါတော့တယ်။",
url: '/',
};
} else if (left > 0 && left <= 24 * H) {
msg = {
title: 'Last day of your free trial',
body: "Tomorrow your full report and plan lock again. Don't lose your progress.\nအခမဲ့ စမ်းသုံးမှု ဒီနေ့ နောက်ဆုံးပါ။",
url: '/',
};
} else if (left <= 0 && left > -24 * H) {
msg = {
title: `Your trial ended. ${offer} MMK first month 🎁`,
body: `Special price for 48 hours only (normally ${normal}).\nပထမလ ${offerMy} ကျပ်သာ။ ၄၈ နာရီသာ ရပါမယ်။`,
url: '/',
};
} else if (left <= -24 * H && left > -48 * H) {
msg = {
title: `Last chance: ${offer} MMK first month`,
body: 'Your trial offer ends today.\nအထူးဈေး ဒီနေ့ ကုန်ပါမယ်။',
url: '/',
};
}
}

// 2. looks ranking: place about to expire, or just expired
const scannedAt = lastScan.get(p.id);
if (!msg && scannedAt && p.show_on_looks_board !== false && !p.looks_banned) {
const left = scannedAt + RANK_DAYS * 24 * H - now; // time until the place expires
if (left > 2 * 24 * H && left <= 3 * 24 * H) {
msg = {
title: 'Your ranking place expires in 3 days ⏳',
body: 'Do a camera scan to keep your place.\nသင့် ranking နေရာ ၃ ရက်အတွင်း ကုန်ပါမယ်။ ဆက်ထိန်းဖို့ camera scan လုပ်ပါ။',
url: '/?tab=scan',
};
} else if (left > 0 && left <= 24 * H) {
msg = {
title: 'Last day to keep your ranking place',
body: 'Scan today or you drop off the ranking.\nဒီနေ့ scan မလုပ်ရင် ranking ကနေ ပျောက်သွားပါမယ်။',
url: '/?tab=scan',
};
} else if (left <= 0 && left > -24 * H) {
msg = {
title: 'You dropped off the ranking',
body: 'One camera scan puts you back.\nCamera scan တစ်ခါ လုပ်ရင် ranking ထဲ ပြန်ဝင်ပါမယ်။',
url: '/?tab=scan',
};
}
}

// 3. weekly scan 4. streak
if (!msg && isSunday) {
msg = {
title: 'Weekly scan day 📸',
body: 'See what changed this week. Scan your face now.\nဒီအပတ် ဘာပြောင်းလဲလဲ ကြည့်ဖို့ မျက်နှာ စကင်န်ဖတ်ပါ။',
url: '/',
};
} else if (!msg && p.last_active_date !== today) {
const streak = p.current_streak ?? 0;
msg =
streak > 0
? {
title: `Don't lose your ${streak}-day streak 🔥`,
body: "Finish today's tasks to keep it alive.\nStreak မပြတ်အောင် ဒီနေ့ အလုပ်တွေ ပြီးအောင် လုပ်ပါ။",
url: '/',
}
: {
title: "Today's tasks are waiting",
body: '3 tasks = 1 day closer to your next level.\nအလုပ် ၃ ခု = နောက်အဆင့်နဲ့ တစ်ရက် ပိုနီးလာပြီ။',
url: '/',
};
}

if (msg && (await sendTo(sub, msg))) sent++;
}

return Response.json({ sent, total: subs.length, billing });
}

/* ---------------- monthly shop bills ---------------- */
type Db = ReturnType<typeof adminDb>;

async function pushUser(db: Db, userId: string, msg: Message) {
const { data } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').eq('user_id', userId);
let n = 0;
for (const s of (data ?? []) as Sub[]) if (await sendTo(s, msg)) n++;
return n;
}

async function shopBills(db: Db) {
const day = new Date(Date.now() + 6.5 * H).getUTCDate(); // today's date in Myanmar
if (![1, 5, 7, 8].includes(day)) return { day, skipped: true };

let made = 0;
if (day === 1) {
const { data, error } = await db.rpc('make_seller_bills');
if (error) throw error;
made = Number(data ?? 0);
}

type Bill = { id: string; seller_id: string; shop_name: string; commission_mmk: number; due_at: string; status: string };
const { data: rows } = await db.from('seller_bills').select('id, seller_id, shop_name, commission_mmk, due_at, status').eq('status', 'unpaid');
const unpaid = (rows ?? []) as Bill[];
const now = Date.now();
let told = 0;
for (const b of unpaid) {
const amount = Number(b.commission_mmk).toLocaleString('en-US');
const late = new Date(b.due_at).getTime() < now;
let msg: Message | null = null;
if (day === 1 && !late) {
msg = {
title: `🧾 Your Potentia bill: ${amount} MMK`,
body: `20% of last month's shop sales. Pay by the 7th in My Shop → Bills.\nပြီးခဲ့တဲ့လ အရောင်းရဲ့ 20% (${amount} ကျပ်) ကို ၇ ရက်နေ့မတိုင်ခင် ပေးချေပါ။`,
url: '/?tab=marketplace',
};
} else if ((day === 5 || day === 7) && !late) {
msg = {
title: day === 7 ? `Last day to pay your ${amount} MMK bill` : `Reminder: ${amount} MMK bill due on the 7th`,
body: `Pay in My Shop → Bills so your products stay in the Shop.\nသင့်ပစ္စည်းတွေ ဆက်ပေါ်နေဖို့ My Shop → Bills မှာ ပေးချေပါ။`,
url: '/?tab=marketplace',
};
} else if (day === 8 && late) {
msg = {
title: 'Your shop is hidden ⚠️',
body: `Your ${amount} MMK bill is overdue. Pay in My Shop → Bills and your products come back.\nငွေတောင်းခံလွှာ ရက်ကျော်နေလို့ ဆိုင်ကို ဖျောက်ထားပါတယ်။ ပေးချေပြီးတာနဲ့ ပြန်ပေါ်ပါမယ်။`,
url: '/?tab=marketplace',
};
}
if (msg) told += await pushUser(db, b.seller_id, msg);
}

if (day === 1 && made > 0) {
const total = unpaid.reduce((s, b) => s + Number(b.commission_mmk), 0);
await pushUser(db, ADMIN_USER_ID, {
title: `🧾 ${made} seller bill(s) made`,
body: `Sellers owe you ${total.toLocaleString('en-US')} MMK, due on the 7th.`,
url: '/admin',
});
}
if (day === 8) {
const late = unpaid.filter(b => new Date(b.due_at).getTime() < now);
if (late.length) {
await pushUser(db, ADMIN_USER_ID, {
title: `⚠️ ${late.length} seller(s) didn't pay`,
body: `${late.map(b => b.shop_name).join(', ')}. Their products are hidden until they pay.`,
url: '/admin',
});
}
}
return { day, made, unpaid: unpaid.length, told };
}

