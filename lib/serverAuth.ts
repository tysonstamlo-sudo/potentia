// lib/serverAuth.ts — server-only helpers shared by the API routes. Never import this in a 'use client' file.

import { adminDb } from './pushServer';

/** The signed-in user who sent this request, or null. */
export async function getUser(req: Request): Promise<{ id: string } | null> {
const token = req.headers.get('authorization')?.replace('Bearer ', '');
if (!token) return null;
const { data } = await adminDb().auth.getUser(token);
return data?.user ? { id: data.user.id as string } : null;
}

/** The visitor's real IP address (Vercel puts it first in x-forwarded-for). */
export function clientIp(req: Request): string {
const fwd = req.headers.get('x-forwarded-for');
if (fwd) return fwd.split(',')[0].trim();
return req.headers.get('x-real-ip') ?? '';
}

export type AiKind = 'morph' | 'profile' | 'food' | 'rate';

export const PAID_TIERS = ['1month', '6months', '1year'];

type Prof = { is_premium: boolean | null; subscription_tier: string | null; subscription_expires_at: string | null };

async function profileOf(userId: string): Promise<Prof | null> {
const { data } = await adminDb()
.from('profiles')
.select('is_premium, subscription_tier, subscription_expires_at')
.eq('id', userId)
.single();
return (data as Prof) ?? null;
}

const active = (p: Prof | null) =>
!!p && !!p.is_premium && !!p.subscription_expires_at && new Date(p.subscription_expires_at).getTime() > Date.now();

/** Premium of any kind: paid, free trial or invite reward. */
export async function hasPremium(userId: string) {
return active(await profileOf(userId));
}

/** Paid Premium only (not the free trial, not invite rewards). Used for the morph. */
export async function hasPaidPremium(userId: string) {
const p = await profileOf(userId);
return active(p) && PAID_TIERS.includes(p?.subscription_tier ?? '');
}

/**
* Daily limit for AI features so nobody can run up the bill.
* Returns how many are left today (after counting this one), or -1 if the limit is reached.
*/
export async function takeAiCredit(userId: string, kind: AiKind, perDay: number): Promise<number> {
const db = adminDb();
const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const { count } = await db
.from('ai_usage')
.select('id', { count: 'exact', head: true })
.eq('user_id', userId)
.eq('kind', kind)
.gte('created_at', since);
const used = count ?? 0;
if (used >= perDay) return -1;
await db.from('ai_usage').insert({ user_id: userId, kind });
return perDay - used - 1;
}

/** Give back a credit when the AI call failed (so users aren't charged for errors). */
export async function refundAiCredit(userId: string, kind: AiKind) {
const db = adminDb();
const { data } = await db
.from('ai_usage')
.select('id')
.eq('user_id', userId)
.eq('kind', kind)
.order('created_at', { ascending: false })
.limit(1);
const row = (data as { id: number }[] | null)?.[0];
if (row) await db.from('ai_usage').delete().eq('id', row.id);
}

/** Splits "data:image/jpeg;base64,AAAA" into its parts. */
export function parseDataUrl(url: unknown): { mime: string; data: string } | null {
if (typeof url !== 'string') return null;
const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
if (!m) return null;
if (m[2].length > 4_000_000) return null; // ~3 MB image max
return { mime: m[1], data: m[2] };
}

