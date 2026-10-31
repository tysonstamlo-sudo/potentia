// app/api/trial/start/route.ts — starts the 7-day free trial, but only once per phone.
// Checks, in order:
// 1. this account never had a trial and never paid
// 2. this phone's hidden ID never started a trial (survives logging out / new Gmail)
// 3. this phone's fingerprint + network never started a trial (survives deleting the app)
// 4. not too many trials from one network in 3 days (stops farming on one Wi-Fi)
// If the new user was invited, the friend who invited them gets 7 days of Premium.

import { adminDb, sendTo, type Sub } from '../../../../lib/pushServer';
import { getUser, clientIp } from '../../../../lib/serverAuth';

export const dynamic = 'force-dynamic';

const TRIAL_DAYS = 7;
const REWARD_DAYS = 7;
const MAX_REWARDS = 1; // one invite reward per person: 7-day trial + 7 days = 14 free days max
const NETWORK_LIMIT = 5; // max trials from one IP in 3 days

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });

const body = (await req.json().catch(() => ({}))) as { deviceId?: string; fingerprint?: string };
const deviceId = clean(body.deviceId);
const fingerprint = clean(body.fingerprint);
const ip = clientIp(req);
const db = adminDb();

type P = {
is_premium: boolean | null;
subscription_expires_at: string | null;
trial_used_at: string | null;
referred_by: string | null;
};
const { data: profRaw } = await db
.from('profiles')
.select('is_premium, subscription_expires_at, trial_used_at, referred_by')
.eq('id', user.id)
.single();
const prof = profRaw as P | null;
if (!prof) return Response.json({ code: 'profile' }, { status: 400 });
if (prof.trial_used_at) return Response.json({ code: 'used' }, { status: 409 });
if (prof.is_premium && prof.subscription_expires_at && new Date(prof.subscription_expires_at).getTime() > Date.now()) {
return Response.json({ code: 'already' }, { status: 409 });
}
const { count: paid } = await db
.from('premium_requests')
.select('id', { count: 'exact', head: true })
.eq('user_id', user.id)
.eq('status', 'approved');
if ((paid ?? 0) > 0) return Response.json({ code: 'member' }, { status: 409 });

// ---- anti-cheat ----
let reason: string | null = null;
if (!deviceId || !fingerprint) reason = 'no_device';

if (!reason) {
const { count } = await db
.from('trial_claims')
.select('id', { count: 'exact', head: true })
.eq('device_id', deviceId)
.eq('blocked', false);
if ((count ?? 0) > 0) reason = 'device';
}
if (!reason && ip) {
const since = new Date(Date.now() - 90 * 86400000).toISOString();
const { count } = await db
.from('trial_claims')
.select('id', { count: 'exact', head: true })
.eq('fingerprint', fingerprint)
.eq('ip', ip)
.eq('blocked', false)
.gte('created_at', since);
if ((count ?? 0) > 0) reason = 'device';
}
if (!reason && ip) {
const since = new Date(Date.now() - 3 * 86400000).toISOString();
const { count } = await db
.from('trial_claims')
.select('id', { count: 'exact', head: true })
.eq('ip', ip)
.eq('blocked', false)
.gte('created_at', since);
if ((count ?? 0) >= NETWORK_LIMIT) reason = 'network';
}

if (reason) {
await db.from('trial_claims').insert({ user_id: user.id, device_id: deviceId || null, fingerprint, ip, blocked: true, reason });
return Response.json({ code: reason }, { status: 403 });
}

// ---- start the trial ----
const ends = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
const { error } = await db
.from('profiles')
.update({ is_premium: true, subscription_tier: 'trial', subscription_expires_at: ends, trial_used_at: new Date().toISOString() })
.eq('id', user.id)
.is('trial_used_at', null);
if (error) return Response.json({ code: 'error', message: error.message }, { status: 500 });
await db.from('trial_claims').insert({ user_id: user.id, device_id: deviceId, fingerprint, ip, blocked: false });

// ---- reward the friend who invited them ----
if (prof.referred_by) {
try {
type R = {
is_premium: boolean | null;
subscription_tier: string | null;
subscription_expires_at: string | null;
referral_rewards: number | null;
};
const { data: refRaw } = await db
.from('profiles')
.select('is_premium, subscription_tier, subscription_expires_at, referral_rewards')
.eq('id', prof.referred_by)
.single();
const r = refRaw as R | null;
if (r && (r.referral_rewards ?? 0) < MAX_REWARDS) {
const exp = r.subscription_expires_at ? new Date(r.subscription_expires_at).getTime() : 0;
const activeNow = !!r.is_premium && exp > Date.now();
const base = activeNow ? exp : Date.now();
await db
.from('profiles')
.update({
is_premium: true,
subscription_tier: activeNow ? r.subscription_tier : 'referral',
subscription_expires_at: new Date(base + REWARD_DAYS * 86400000).toISOString(),
referral_rewards: (r.referral_rewards ?? 0) + 1,
})
.eq('id', prof.referred_by);
const { data: subs } = await db
.from('push_subscriptions')
.select('id, user_id, endpoint, p256dh, auth')
.eq('user_id', prof.referred_by);
for (const s of (subs ?? []) as Sub[]) {
await sendTo(s, {
title: 'Your friend joined 🎉 +7 days Premium',
body: 'Thanks for inviting them. 7 days of Premium were added to your account.\nသူငယ်ချင်း ဝင်လာလို့ Premium ၇ ရက် ထပ်ရပါပြီ။',
url: '/',
});
}
}
} catch (e) {
console.error('referral reward failed', e);
}
}

return Response.json({ ends });
}

