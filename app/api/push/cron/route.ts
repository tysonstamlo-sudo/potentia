// app/api/push/cron/route.ts — runs once a day (set in vercel.json).
// Sends a streak reminder to anyone who hasn't done today's tasks, and a scan reminder on Sundays.

import { adminDb, sendTo, type Sub, type Message } from '../../../../lib/pushServer';

export const dynamic = 'force-dynamic';

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
  const { data: profiles } = await db
    .from('profiles')
    .select('id, username, last_active_date, current_streak')
    .in('id', userIds);
  type Prof = { id: string; username: string | null; last_active_date: string | null; current_streak: number | null };
  const byId = new Map<string, Prof>(((profiles ?? []) as Prof[]).map(p => [p.id, p]));

  const today = new Date().toISOString().slice(0, 10); // the app uses UTC dates
  const isSunday = new Date(Date.now() + 6.5 * 3600 * 1000).getUTCDay() === 0; // Sunday in Myanmar

  let sent = 0;
  for (const sub of subs as Sub[]) {
    const p = byId.get(sub.user_id);
    if (!p) continue;
    let msg: Message | null = null;

    if (isSunday) {
      msg = {
        title: 'Weekly scan day 📸',
        body: 'See what changed this week. Scan your face now.\nဒီအပတ် ဘာပြောင်းလဲလဲ ကြည့်ဖို့ မျက်နှာ စကင်န်ဖတ်ပါ။',
        url: '/',
      };
    } else if (p.last_active_date !== today) {
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
