'use client';

// lib/gallery.ts — progress photos, saved ONLY on this phone (IndexedDB), never uploaded.
// Each camera scan saves: the face crop (for the gallery) and a small full frame (for the ghost overlay).

export type GalleryPhoto = {
id: string;
at: number; // time taken (ms)
face: string; // face crop, JPEG data URL
frame: string; // full camera frame, small JPEG data URL (ghost overlay)
score: number; // score shown for that scan
};

const DB = 'potentia-gallery';
const STORE = 'photos';
const MAX = 120; // keep the newest 120 photos

function open(): Promise<IDBDatabase> {
return new Promise((resolve, reject) => {
const req = indexedDB.open(DB, 1);
req.onupgradeneeded = () => {
const db = req.result;
if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('at', 'at');
};
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
const db = await open();
return new Promise<T>((resolve, reject) => {
const t = db.transaction(STORE, mode);
const r = run(t.objectStore(STORE));
r.onsuccess = () => resolve(r.result);
r.onerror = () => reject(r.error);
});
}

/** Shrink a data URL to max `size` px (JPEG). */
export async function shrink(src: string, size: number, quality = 0.82): Promise<string> {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = src;
});
const scale = Math.min(1, size / Math.max(img.width, img.height));
const c = document.createElement('canvas');
c.width = Math.round(img.width * scale);
c.height = Math.round(img.height * scale);
c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
return c.toDataURL('image/jpeg', quality);
}

export async function listPhotos(): Promise<GalleryPhoto[]> {
try {
const all = await tx<GalleryPhoto[]>('readonly', s => s.getAll() as IDBRequest<GalleryPhoto[]>);
return all.sort((a, b) => b.at - a.at);
} catch {
return [];
}
}

export async function lastPhoto(): Promise<GalleryPhoto | null> {
return (await listPhotos())[0] ?? null;
}

export async function addPhoto(p: { face: string; frame: string; score: number }) {
try {
const photo: GalleryPhoto = {
id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
at: Date.now(),
face: await shrink(p.face, 520),
frame: await shrink(p.frame, 480, 0.7),
score: p.score,
};
await tx('readwrite', s => s.put(photo));
const all = await listPhotos();
for (const old of all.slice(MAX)) await tx('readwrite', s => s.delete(old.id));
} catch (e) {
console.warn('gallery save failed', e);
}
}

export async function deletePhoto(id: string) {
try {
await tx('readwrite', s => s.delete(id));
} catch {
/* ignore */
}
}

