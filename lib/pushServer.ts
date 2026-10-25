// lib/pushServer.ts — server-only helpers for sending notifications. Never import this in a 'use client' file.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const ADMIN_USER_ID = '0ae23fa9-66ba-446d-8f3d-a06d49ee8760';

export function adminDb() {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
return createClient(url, key, { auth: { persistSession: false } });
}

let configured = false;
function setup() {
if (configured) return;
const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
if (!pub || !priv) throw new Error('Missing VAPID keys');
webpush.setVapidDetails(subject, pub, priv);
configured = true;
}

export type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
export type Message = { title: string; body: string; url?: string };

/** Send one message to one phone. Removes subscriptions that no longer exist. */
export async function sendTo(sub: Sub, msg: Message): Promise<boolean> {
setup();
try {
await webpush.sendNotification(
{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
JSON.stringify(msg),
{ TTL: 60 * 60 * 12 },
);
return true;
} catch (e) {
const status = (e as { statusCode?: number }).statusCode;
if (status === 404 || status === 410) {
await adminDb().from('push_subscriptions').delete().eq('id', sub.id);
} else {
console.error('Push failed', status, (e as Error).message);
}
return false;
}
}

