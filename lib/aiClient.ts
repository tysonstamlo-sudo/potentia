'use client';

// lib/aiClient.ts — shrink a photo and send it to one of our AI routes.

import { supabase } from './supabase';

/** Load any image (file or data URL) and return a JPEG data URL no bigger than `max` px. */
export async function toAiImage(src: File | string, max = 1024, quality = 0.86): Promise<string> {
const url = typeof src === 'string' ? src : URL.createObjectURL(src);
try {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = url;
});
const scale = Math.min(1, max / Math.max(img.width, img.height));
const c = document.createElement('canvas');
c.width = Math.round(img.width * scale);
c.height = Math.round(img.height * scale);
const ctx = c.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, c.width, c.height);
ctx.drawImage(img, 0, 0, c.width, c.height);
return c.toDataURL('image/jpeg', quality);
} finally {
if (typeof src !== 'string') URL.revokeObjectURL(url);
}
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; code: string; perDay?: number };

export async function callAi<T>(path: string, body: unknown): Promise<AiResult<T>> {
try {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) return { ok: false, code: 'auth' };
const res = await fetch(path, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
body: JSON.stringify(body),
});
const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
if (!res.ok) return { ok: false, code: String(json.code ?? 'error'), perDay: json.perDay as number | undefined };
return { ok: true, data: json as T };
} catch {
return { ok: false, code: 'network' };
}
}

/** Friendly English message for an error code (pass through t() to translate). */
export function aiErrorText(code: string): string {
switch (code) {
case 'premium':
return 'This is a Premium feature.';
case 'limit':
return "You've reached today's limit. Try again tomorrow.";
case 'not_ready':
return 'This feature is coming soon.';
case 'bad_image':
return 'That photo could not be read. Try another one.';
case 'network':
return 'No connection. Check your internet and try again.';
case 'auth':
return 'Please log in again.';
default:
return 'Something went wrong. Please try again.';
}
}

