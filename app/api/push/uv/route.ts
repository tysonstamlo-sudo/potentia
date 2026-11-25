// app/api/push/uv/route.ts — morning sun alert at 7am Myanmar time (set in vercel.json).
// Goes to Potentia Skin users (or anyone who did a skin scan in the last 30 days) with "Daily sun alert" on.

import { adminDb, sendTo, type Sub } from '../../../../lib/pushServer';
import { uvToday, uvMessage, CITY_KEYS } from '../../../../lib/uv';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
return new Response('Unauthorized', { status: 401 });
}
const db = adminDb();

const { data: people, error } = await db.rpc('uv_alert_people');
if (error) return Response.json({ error: error.message }, { status: 500 });
const list = (people ?? []) as { user_id: string; city: string }[];
if (!list.length) return Response.json({ sent: 0 });

// one weather lookup per city
const cities = Array.from(new Set(list.map(p => p.city))).filter(c => CITY_KEYS.includes(c));
const uv = new Map<string, number | null>();
await Promise.all(cities.map(async c => uv.set(c, await uvToday(c))));

const cityOf = new Map(list.map(p => [p.user_id, p.city]));
const { data: subs } = await db
.from('push_subscriptions')
.select('id, user_id, endpoint, p256dh, auth')
.in('user_id', Array.from(cityOf.keys()));

let sent = 0;
for (const sub of (subs ?? []) as Sub[]) {
const city = cityOf.get(sub.user_id);
const level = city ? uv.get(city) : null;
if (!city || level == null) continue;
const msg = uvMessage(level, city);
if (msg && (await sendTo(sub, msg))) sent++;
}
return Response.json({ sent, uv: Object.fromEntries(uv) });
}

