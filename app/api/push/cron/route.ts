// app/api/push/cron/route.ts — runs once a day at 6pm Myanmar time (set in vercel.json).
// Order of importance for each person:
// 1. free trial ending soon / just ended (with the first-month offer)
// 2. Sunday weekly scan
// 3. streak reminder if today's tasks aren't done

import { adminDb, sendTo, type Sub, type Message } from '../../../../lib/pushServer';
import { trialOfferMmk, planMmk } from '../../../../lib/payments';

export const dynamic = 'force-dynamic';

const H = 3600 * 1000;
const toMyDigits = (s: string) => s.replace(/[0-9]/g, d => '၀၁၂၃၄၅၆၇၈၉'[Number(d)]);

export async function GET(req: Request) {
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with cron requests
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
return new Response('Unauthorized', { status: 401 });
}

const db = adminDb();
const { data: subs, error } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
if (error) return Response.json({ error: error.message }, { status: 500 });
if (!subs || subs.length === 0) return Response.json({ sent: 0 });

const userIds = Array.from(new Set((subs as Sub[]).map(s => s.user_id)));
const [{ data: profiles }, { data: requests }] = await Promise.all([
db
.from('profiles')
.select('id, username, last_active_date, current_streak, subscription_tier, subscription_expires_at')
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
};
const byId = new Map<string, Prof>(((profiles ?? []) as Prof[]).map(p => [p.id, p]));
const paying = new Set(((requests ?? []) as { user_id: string }[]).map(r => r.user_id));

const now = Date.now();
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

// 2. weekly scan 3. streak
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

return Response.json({ sent, total: subs.length });
}

