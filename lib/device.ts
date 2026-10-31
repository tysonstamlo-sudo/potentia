'use client';

// lib/device.ts — a hidden ID for this phone plus a phone "fingerprint".
// Used only to stop the same phone from taking the free trial twice (see Privacy Policy).

const KEY = 'ptn_did';

function readCookie(): string | null {
try {
const m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]+)'));
return m ? decodeURIComponent(m[1]) : null;
} catch {
return null;
}
}

function idb<T>(fn: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T | null> {
return new Promise(resolve => {
try {
const open = indexedDB.open('potentia', 1);
open.onupgradeneeded = () => open.result.createObjectStore('kv');
open.onerror = () => resolve(null);
open.onsuccess = () => {
try {
const tx = open.result.transaction('kv', mode);
const req = fn(tx.objectStore('kv'));
req.onsuccess = () => resolve((req.result as T) ?? null);
req.onerror = () => resolve(null);
} catch {
resolve(null);
}
};
} catch {
resolve(null);
}
});
}

/** The same ID every time on this phone, kept in 3 places so clearing one isn't enough. */
export async function getDeviceId(): Promise<string> {
let id: string | null = null;
try {
id = localStorage.getItem(KEY);
} catch {
/* ignore */
}
id = id || readCookie() || ((await idb<string>(s => s.get(KEY), 'readonly')) as string | null);
if (!id) {
id =
typeof crypto !== 'undefined' && 'randomUUID' in crypto
? crypto.randomUUID()
: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
try {
localStorage.setItem(KEY, id);
} catch {
/* ignore */
}
try {
document.cookie = `${KEY}=${encodeURIComponent(id)}; max-age=${60 * 60 * 24 * 365 * 5}; path=/; SameSite=Lax`;
} catch {
/* ignore */
}
await idb(s => s.put(id as string, KEY), 'readwrite');
return id;
}

async function sha256(text: string) {
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
return Array.from(new Uint8Array(buf))
.map(b => b.toString(16).padStart(2, '0'))
.join('');
}

/** Things about the phone itself that stay the same even after deleting the app. */
export async function getFingerprint(): Promise<string> {
const parts: string[] = [];
try {
const n = navigator as Navigator & { deviceMemory?: number };
parts.push(
`${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio}`,
Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
(navigator.languages ?? [navigator.language]).join(','),
String(navigator.hardwareConcurrency ?? ''),
String(n.deviceMemory ?? ''),
navigator.platform ?? '',
String(navigator.maxTouchPoints ?? ''),
);
// graphics chip
const gl = document.createElement('canvas').getContext('webgl');
if (gl) {
const ext = gl.getExtension('WEBGL_debug_renderer_info');
parts.push(String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
}
// how this phone draws text and shapes
const c = document.createElement('canvas');
c.width = 240;
c.height = 60;
const ctx = c.getContext('2d');
if (ctx) {
ctx.textBaseline = 'top';
ctx.font = '16px Arial';
ctx.fillStyle = '#f60';
ctx.fillRect(10, 10, 100, 30);
ctx.fillStyle = '#069';
ctx.fillText('Potentia ✓ ပိုတင်ရှာ 1.0', 4, 20);
ctx.strokeStyle = 'rgba(102,204,0,0.7)';
ctx.arc(120, 30, 20, 0, Math.PI * 2);
ctx.stroke();
parts.push(c.toDataURL());
}
} catch {
/* ignore */
}
return sha256(parts.join('|'));
}

