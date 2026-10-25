'use client';

// lib/push.ts — turn notifications on/off from the browser.

import { supabase } from './supabase';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64: string) {
const padding = '='.repeat((4 - (base64.length % 4)) % 4);
const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
const raw = atob(b64);
const out = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
return out;
}

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

function isIOS() {
return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone() {
return (
window.matchMedia('(display-mode: standalone)').matches ||
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(navigator as any).standalone === true
);
}

export async function getPushState(): Promise<PushState> {
if (typeof window === 'undefined') return 'unsupported';
// iPhone only allows notifications for apps added to the Home Screen
if (isIOS() && !isStandalone()) return 'needs-install';
if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
if (Notification.permission === 'denied') return 'denied';
const reg = await navigator.serviceWorker.getRegistration('/sw.js');
const sub = reg ? await reg.pushManager.getSubscription() : null;
return sub ? 'on' : 'off';
}

export async function enablePush(userId: string): Promise<PushState> {
if (!PUBLIC_KEY) {
console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing');
return 'unsupported';
}
const permission = await Notification.requestPermission();
if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

const reg = await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;
const sub =
(await reg.pushManager.getSubscription()) ??
(await reg.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
}));

const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
const { error } = await supabase.from('push_subscriptions').upsert(
{ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
{ onConflict: 'endpoint' },
);
if (error) console.error('Saving push subscription failed:', error);
return 'on';
}

export async function disablePush(): Promise<PushState> {
const reg = await navigator.serviceWorker.getRegistration('/sw.js');
const sub = reg ? await reg.pushManager.getSubscription() : null;
if (sub) {
await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
await sub.unsubscribe();
}
return 'off';
}

