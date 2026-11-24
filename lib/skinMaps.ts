'use client';

// lib/skinMaps.ts — Potentia Skin maps, made on the phone from the selfie (free, no AI, nothing uploaded).
// Each map colours the skin where the photo shows: dark spots, redness, shine/oil, rough texture.
// These are what a phone camera can honestly see. Lighting changes them, so compare scans taken in the same light.

export type MapKey = 'spots' | 'redness' | 'oil' | 'texture';
export const MAP_KEYS: MapKey[] = ['spots', 'redness', 'oil', 'texture'];
export const MAP_COLORS: Record<MapKey, [number, number, number]> = {
spots: [175, 95, 255], // violet (brown vanished on brown skin)
redness: [235, 45, 70], // red
oil: [255, 205, 40], // yellow
texture: [60, 215, 255], // cyan
};

export type FaceBox = { x: number; y: number; w: number; h: number }; // 0-1 of the photo
type Pt = { x: number; y: number }; // 0-1 of the photo

// MediaPipe face mesh outlines (478-point model)
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const BROW_R = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
const BROW_L = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];

/** Convex hull (monotone chain) — used to draw feature areas whatever order the points come in. */
function hull(pts: Pt[]): Pt[] {
const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const lo: Pt[] = [];
for (const q of p) {
while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
lo.push(q);
}
const up: Pt[] = [];
for (const q of [...p].reverse()) {
while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
up.push(q);
}
return lo.slice(0, -1).concat(up.slice(0, -1));
}
function grow(poly: Pt[], k: number): Pt[] {
const c = poly.reduce((a, q) => ({ x: a.x + q.x / poly.length, y: a.y + q.y / poly.length }), { x: 0, y: 0 });
return poly.map(q => ({ x: c.x + (q.x - c.x) * k, y: c.y + (q.y - c.y) * k }));
}


/** Box blur (separable, edge-clamped) on a W x H float map. */
function blur(src: Float32Array, W: number, H: number, r: number): Float32Array {
const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
const n = 2 * r + 1;
for (let y = 0; y < H; y++) {
let acc = 0;
const row = y * W;
for (let k = -r; k <= r; k++) acc += src[row + Math.min(W - 1, Math.max(0, k))];
for (let x = 0; x < W; x++) {
tmp[row + x] = acc / n;
acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
}
}
for (let x = 0; x < W; x++) {
let acc = 0;
for (let k = -r; k <= r; k++) acc += tmp[Math.min(H - 1, Math.max(0, k)) * W + x];
for (let y = 0; y < H; y++) {
out[y * W + x] = acc / n;
acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
}
}
return out;
}

export type SkinMaps = {
width: number;
height: number;
base: string; // the photo, resized (data URL)
overlays: Record<MapKey | 'all', string>; // photo + coloured map (data URLs)
coverage: Record<MapKey, number>; // % of visible face skin each map covers
};

const DEFAULT_BOX: FaceBox = { x: 0.29, y: 0.22, w: 0.42, h: 0.5 }; // a centred selfie, when no face outline is available

function load(src: string): Promise<HTMLImageElement> {
return new Promise((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = src;
});
}

// sRGB -> CIE Lab (D65)
function lab(r: number, g: number, b: number): [number, number, number] {
const f = (c: number) => {
c /= 255;
return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
};
const R = f(r), G = f(g), B = f(b);
let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
const g3 = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
x = g3(x);
y = g3(y);
z = g3(z);
return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export async function makeSkinMaps(photo: string, opts: { landmarks?: Pt[]; faceBox?: FaceBox } = {}, maxSide = 640): Promise<SkinMaps> {
const faceBox = opts.faceBox;
const img = await load(photo);
const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
const W = Math.round(img.width * scale);
const H = Math.round(img.height * scale);
const c = document.createElement('canvas');
c.width = W;
c.height = H;
const ctx = c.getContext('2d', { willReadFrequently: true })!;
ctx.drawImage(img, 0, 0, W, H);
const src = ctx.getImageData(0, 0, W, H);
const px = src.data;
const N = W * H;

const box = faceBox ?? DEFAULT_BOX;
const bx = box.x * W, by = box.y * H, bw = box.w * W, bh = box.h * H;
const cx = bx + bw / 2, cy = by + bh / 2;

// where face features are (eyes, brows, nostrils, mouth): not counted as spots or texture
const featureRects: [number, number, number, number][] = [
[0.12, 0.17, 0.46, 0.43], // left brow + eye
[0.54, 0.17, 0.88, 0.43], // right brow + eye
[0.37, 0.58, 0.63, 0.7], // nostrils
[0.27, 0.7, 0.73, 0.87], // mouth
];
// With face landmarks: an exact face outline, and exact eyes, brows, lips and nostrils to leave out
const lm = opts.landmarks && opts.landmarks.length >= 468 ? opts.landmarks : null;
let ovalMask: Uint8ClampedArray | null = null;
let fullOval: Uint8ClampedArray | null = null;
let featMask: Uint8ClampedArray | null = null;
if (lm) {
const m = document.createElement('canvas');
m.width = W;
m.height = H;
const mc = m.getContext('2d', { willReadFrequently: true })!;
const poly = (pts: Pt[]) => {
mc.beginPath();
pts.forEach((q, k) => (k ? mc.lineTo(q.x * W, q.y * H) : mc.moveTo(q.x * W, q.y * H)));
mc.closePath();
mc.fill();
};
mc.fillStyle = '#fff';
const oval = FACE_OVAL.map(i => lm[i]);
poly(oval);
fullOval = mc.getImageData(0, 0, W, H).data;
mc.clearRect(0, 0, W, H);
poly(grow(oval, 0.93)); // stay off the shadowed edge of the face
ovalMask = mc.getImageData(0, 0, W, H).data;
mc.clearRect(0, 0, W, H);
for (const [ids, k] of [
[EYE_R, 1.45],
[EYE_L, 1.45],
[BROW_R, 1.35],
[BROW_L, 1.35],
[LIPS, 1.12],
] as const)
poly(grow(hull(ids.map(i => lm[i])), k));
// nostrils
const nW = Math.hypot((lm[98].x - lm[327].x) * W, (lm[98].y - lm[327].y) * H);
for (const [a, b] of [
[98, 2],
[327, 2],
]) {
mc.beginPath();
mc.arc(((lm[a].x + lm[b].x) / 2) * W, ((lm[a].y + lm[b].y) / 2) * H, nW * 0.2, 0, Math.PI * 2);
mc.fill();
}
featMask = mc.getImageData(0, 0, W, H).data;
}
const isFeature = (x: number, y: number) => {
if (featMask) return featMask[(y * W + x) * 4 + 3] > 0;
const u = (x - bx) / bw, v = (y - by) / bh;
return featureRects.some(([x0, y0, x1, y1]) => u >= x0 && u <= x1 && v >= y0 && v <= y1);
};

const L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N);
const skin = new Uint8Array(N);
let skinCount = 0, sumL = 0, sumA = 0;
for (let y = 0; y < H; y++) {
for (let x = 0; x < W; x++) {
const i = y * W + x, p = i * 4;
const r = px[p], g = px[p + 1], b = px[p + 2];
const [l, a, bb] = lab(r, g, b);
L[i] = l;
A[i] = a;
B[i] = bb;
if (ovalMask) {
if (ovalMask[i * 4 + 3] === 0) continue;
} else {
const ex = (x - cx) / (bw / 2), ey = (y - cy) / (bh / 2);
if (ex * ex + ey * ey > 1) continue;
}
if (isFeature(x, y)) continue; // eyes, brows, lips, nostrils are not skin
// YCbCr skin test (works across skin tones; drops hair, background, clothes)
const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
if (cr < 133 || cr > 180 || cb < 77 || cb > 135 || l < 12) continue;
skin[i] = 1;
skinCount++;
sumL += l;
sumA += a;
}
}
const meanL = skinCount ? sumL / skinCount : 60;
const meanA = skinCount ? sumA / skinCount : 12;

// local average brightness (box blur via an integral image)
const rad = Math.max(4, Math.round(Math.min(W, H) * 0.025));
const I = new Float64Array((W + 1) * (H + 1));
for (let y = 0; y < H; y++) {
let row = 0;
for (let x = 0; x < W; x++) {
row += L[y * W + x];
I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row;
}
}
const localMean = (x: number, y: number) => {
const x0 = Math.max(0, x - rad), y0 = Math.max(0, y - rad), x1 = Math.min(W, x + rad + 1), y1 = Math.min(H, y + rad + 1);
const s = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
return s / ((x1 - x0) * (y1 - y0));
};

const strength: Record<MapKey, Float32Array> = {
spots: new Float32Array(N),
redness: new Float32Array(N),
oil: new Float32Array(N),
texture: new Float32Array(N),
};
const hits: Record<MapKey, number> = { spots: 0, redness: 0, oil: 0, texture: 0 };

for (let y = 1; y < H - 1; y++) {
for (let x = 1; x < W - 1; x++) {
const i = y * W + x;
if (!skin[i]) continue;
const feature = isFeature(x, y);
const l = L[i];
// dark spots / pigment: clearly darker than the skin around it
if (!feature) {
const d = localMean(x, y) - l;
if (d > 6) {
strength.spots[i] = Math.min(1, (d - 6) / 12);
hits.spots++;
}
}
// redness: clearly redder than this person's own average skin
const ra = A[i] - meanA;
if (ra > 6) {
strength.redness[i] = Math.min(1, (ra - 6) / 12);
hits.redness++;
}
// shine / oil: much brighter than average and low colour (a light reflection)
const chroma = Math.sqrt(A[i] * A[i] + B[i] * B[i]);
if (l > meanL + 16 && chroma < 22) {
strength.oil[i] = Math.min(1, (l - meanL - 16) / 14);
hits.oil++;
}
// rough texture / pores: strong fine detail in the skin
if (!feature) {
const lap = Math.abs(4 * l - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]);
if (lap > 9) {
strength.texture[i] = Math.min(1, (lap - 9) / 14);
hits.texture++;
}
}
}
}

const coverage = {} as Record<MapKey, number>;
for (const k of MAP_KEYS) coverage[k] = skinCount ? Math.round((hits[k] / skinCount) * 1000) / 10 : 0;

// soft versions of each map, so marks read as smooth patches instead of pixel noise
const soft = {} as Record<MapKey, Float32Array>;
for (const k of MAP_KEYS) soft[k] = blur(blur(strength[k], W, H, 1), W, H, 1);

// soft spotlight on the face: background gently darker, face and its features untouched
const face = new Float32Array(N);
for (let y = 0; y < H; y++)
for (let x = 0; x < W; x++) {
const i = y * W + x;
if (fullOval) face[i] = fullOval[i * 4 + 3] > 0 ? 1 : 0;
else {
const ex = (x - cx) / (bw / 2), ey = (y - cy) / (bh / 2);
face[i] = ex * ex + ey * ey <= 1.1 ? 1 : 0;
}
}
const feather = Math.max(6, Math.round(Math.min(W, H) * 0.035));
const glow = blur(blur(face, W, H, feather), W, H, feather);

const draw = (keys: MapKey[]) => {
const out = ctx.createImageData(W, H);
const o = out.data;
for (let i = 0; i < N; i++) {
const p = i * 4;
const dim = 0.62 + 0.38 * glow[i];
let r = px[p] * dim, g = px[p + 1] * dim, b = px[p + 2] * dim;
for (const k of keys) {
const s = soft[k][i];
if (s > 0.04) {
const [cr, cg, cb] = MAP_COLORS[k];
const a = Math.min(0.75, (s - 0.04) * 2.5) * glow[i];
r = r * (1 - a) + cr * a;
g = g * (1 - a) + cg * a;
b = b * (1 - a) + cb * a;
}
}
o[p] = r;
o[p + 1] = g;
o[p + 2] = b;
o[p + 3] = 255;
}
ctx.putImageData(out, 0, 0);
return c.toDataURL('image/jpeg', 0.9);
};

const base = (() => {
ctx.putImageData(src, 0, 0);
return c.toDataURL('image/jpeg', 0.9);
})();
const overlays = {
spots: draw(['spots']),
redness: draw(['redness']),
oil: draw(['oil']),
texture: draw(['texture']),
all: draw(['texture', 'oil', 'redness', 'spots']),
};
return { width: W, height: H, base, overlays, coverage };
}

