'use client';

// lib/track.ts — records simple app steps so you can see where people quit (Admin -> Stats).
// Never records photos, names, emails or anything the person typed. Never slows down or breaks the app.

import { supabase } from './supabase';

export type AppEvent =
| 'app_open'
| 'auth_view'
| 'signup_error'
| 'scan_start'
| 'scan_fail'
| 'locked_seen'
| 'taster_seen'
| 'unlock_tap'
| 'pay_open'
| 'plan_pick'
| 'pay_step'
| 'proof_uploaded'
| 'picks_seen'
| 'pick_open'
| 'gallery_locked'
| 'morph_try';

type Props = Record<string, string | number | boolean | null>;

const DEVICE_KEY = 'potentia_device';

/** A random id for this phone/browser (not linked to the person's name or number). */
function deviceId(): string {
try {
let id = localStorage.getItem(DEVICE_KEY);
if (!id || !/^[a-z0-9-]{8,40}$/.test(id)) {
id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).toLowerCase();
localStorage.setItem(DEVICE_KEY, id);
}
return id;
} catch {
return 'no-storage-device';
}
}

/** Record one step. Fire and forget. */
export function track(event: AppEvent, props: Props = {}) {
if (typeof window === 'undefined') return;
if (process.env.NODE_ENV === 'development') return; // don't count your own testing on localhost
try {
const clean: Props = {};
for (const [k, v] of Object.entries(props)) clean[k.slice(0, 20)] = typeof v === 'string' ? v.slice(0, 60) : v;
void supabase
.from('app_events')
.insert({ device: deviceId(), event, props: clean })
.then(({ error }) => {
if (error) console.warn('track', event, error.message);
});
} catch {
/* never break the app */
}
}

/** Record a step only once per app session (e.g. "opened the app"). */
export function trackOnce(event: AppEvent, props: Props = {}, key: string = event) {
try {
const k = `potentia_t_${key}`;
if (sessionStorage.getItem(k)) return;
sessionStorage.setItem(k, '1');
} catch {
/* if storage is blocked, just record it */
}
track(event, props);
}

