'use client';

// lib/skinPhotos.ts — Potentia Skin before/after photos, kept ONLY on this phone (IndexedDB).
// Never uploaded. Used by the dark-patch tracker and the 30-day Glow Challenge.

export type SkinPhoto = { id?: number; at: number; img: string };

const DB = 'potentia-skin';
const STORE = 'photos';
const KEEP = 60; // keep the newest 60 (about a year of weekly scans)

function open(): Promise<IDBDatabase> {
return new Promise((res, rej) => {
const r = indexedDB.open(DB, 1);
r.onupgradeneeded = () => {
const db = r.result;
if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }).createIndex('at', 'at');
};
r.onsuccess = () => res(r.result);
r.onerror = () => rej(r.error);
});
}

function all(db: IDBDatabase): Promise<SkinPhoto[]> {
return new Promise((res, rej) => {
const q = db.transaction(STORE).objectStore(STORE).index('at').getAll();
q.onsuccess = () => res((q.result as SkinPhoto[]) ?? []);
q.onerror = () => rej(q.error);
});
}

/** Save the photo from a skin scan (oldest ones are removed after 60). */
export async function addSkinPhoto(img: string): Promise<void> {
try {
const db = await open();
await new Promise<void>((res, rej) => {
const tx = db.transaction(STORE, 'readwrite');
tx.objectStore(STORE).add({ at: Date.now(), img });
tx.oncomplete = () => res();
tx.onerror = () => rej(tx.error);
});
const list = await all(db);
if (list.length > KEEP) {
const tx = db.transaction(STORE, 'readwrite');
for (const p of list.slice(0, list.length - KEEP)) if (p.id != null) tx.objectStore(STORE).delete(p.id);
}
} catch {
/* private mode or storage full: before/after just won't show */
}
}

/** All skin photos on this phone, oldest first. */
export async function listSkinPhotos(): Promise<SkinPhoto[]> {
try {
return await all(await open());
} catch {
return [];
}
}

/** The first photo taken on/after `since` and the latest one (for before/after). */
export async function beforeAfter(since = 0): Promise<{ before: SkinPhoto | null; after: SkinPhoto | null }> {
const list = (await listSkinPhotos()).filter(p => p.at >= since);
if (list.length < 2) return { before: list[0] ?? null, after: null };
return { before: list[0], after: list[list.length - 1] };
}

