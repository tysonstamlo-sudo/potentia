// lib/skinAnalysis.ts
// Rough skin readings from photos, computed in the browser (nothing is uploaded).
// Front photo: under-eye darkness, redness, evenness, shine (located with face landmarks).
// Eye close-up: under-eye texture. Nose close-up: pores/blackheads and oil.
// These depend heavily on lighting and camera. They are shown as a separate "Skin" reading
// and are NOT part of the structure score.

export type SkinKey = 'dark_circles' | 'redness' | 'evenness' | 'shine' | 'eye_texture' | 'pores' | 'nose_oil';
export type SkinSource = 'front' | 'eye' | 'nose';

export type SkinItem = {
key: SkinKey;
label: string;
source: SkinSource;
value: number;
score: number; // 0..10
verdict: string; // one line, depends on the score
tip: string; // what to do about it
};

export type SkinReading = {
score: number; // 0..10, average of items
items: SkinItem[]; // weakest first
};

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number }; // pixels in the source image

type Patch = { L: Float32Array; a: Float32Array; w: number; h: number };

/* ---------- colour ---------- */
function srgbToLin(c: number) {
c /= 255;
return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function labF(t: number) {
return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}
function toLab(r: number, g: number, b: number) {
const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
const fx = labF(X), fy = labF(Y), fz = labF(Z);
return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/* ---------- image helpers (browser) ---------- */
function loadImage(src: string): Promise<HTMLImageElement> {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = () => reject(new Error('image'));
img.src = src;
});
}

/** Cut a rectangle out of the image and resample it to a fixed size, as Lab channels. */
function patchFrom(img: HTMLImageElement, r: Rect, w: number, h: number): Patch | null {
const x = Math.max(0, Math.round(r.x));
const y = Math.max(0, Math.round(r.y));
const rw = Math.min(img.naturalWidth - x, Math.round(r.w));
const rh = Math.min(img.naturalHeight - y, Math.round(r.h));
if (rw < 8 || rh < 8) return null;
const c = document.createElement('canvas');
c.width = w;
c.height = h;
const ctx = c.getContext('2d', { willReadFrequently: true });
if (!ctx) return null;
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(img, x, y, rw, rh, 0, 0, w, h);
const d = ctx.getImageData(0, 0, w, h).data;
const L = new Float32Array(w * h);
const a = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) {
const lab = toLab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
L[i] = lab.L;
a[i] = lab.a;
}
return { L, a, w, h };
}

/** Centre square of the photo (what the user saw in the round preview). */
function centerSquare(img: HTMLImageElement): Rect {
const s = Math.min(img.naturalWidth, img.naturalHeight);
return { x: (img.naturalWidth - s) / 2, y: (img.naturalHeight - s) / 2, w: s, h: s };
}
function sub(r: Rect, fx: number, fy: number, fw: number, fh: number): Rect {
return { x: r.x + r.w * fx, y: r.y + r.h * fy, w: r.w * fw, h: r.h * fh };
}

/* ---------- statistics (pure) ---------- */
const mean = (xs: Float32Array) => {
let s = 0;
for (let i = 0; i < xs.length; i++) s += xs[i];
return s / xs.length;
};
const std = (xs: Float32Array) => {
const m = mean(xs);
let s = 0;
for (let i = 0; i < xs.length; i++) s += (xs[i] - m) ** 2;
return Math.sqrt(s / xs.length);
};
/** Fraction of very bright pixels (specular shine). */
export function shineFraction(p: Patch) {
let n = 0;
for (let i = 0; i < p.L.length; i++) if (p.L[i] > 88) n++;
return n / p.L.length;
}
/** Fine texture: mean absolute Laplacian of lightness. */
export function texture(p: Patch) {
let s = 0, n = 0;
for (let y = 1; y < p.h - 1; y++) {
for (let x = 1; x < p.w - 1; x++) {
const i = y * p.w + x;
s += Math.abs(4 * p.L[i] - p.L[i - 1] - p.L[i + 1] - p.L[i - p.w] - p.L[i + p.w]);
n++;
}
}
return s / n;
}
/** Fraction of pixels clearly darker than their surroundings (pores, blackheads, spots). */
export function spotFraction(p: Patch, radius = 6, drop = 8) {
const { w, h, L } = p;
const I = new Float64Array((w + 1) * (h + 1));
for (let y = 0; y < h; y++) {
let row = 0;
for (let x = 0; x < w; x++) {
row += L[y * w + x];
I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
}
}
let n = 0, total = 0;
for (let y = radius; y < h - radius; y++) {
for (let x = radius; x < w - radius; x++) {
const x0 = x - radius, y0 = y - radius, x1 = x + radius + 1, y1 = y + radius + 1;
const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
const local = sum / ((2 * radius + 1) ** 2);
if (L[y * w + x] < local - drop) n++;
total++;
}
}
return total ? n / total : 0;
}

/** Linear score: value at `good` -> 10, value at `bad` -> 3, clamped to 1..10. */
function scoreBetween(v: number, good: number, bad: number) {
const t = (v - good) / (bad - good);
return Math.round(Math.min(10, Math.max(1, 10 - 7 * t)) * 10) / 10;
}

/* ---------- copy ---------- */
const COPY: Record<SkinKey, { label: string; good: string; mid: string; bad: string; tip: string }> = {
dark_circles: {
label: 'Under-eye darkness',
good: 'Under-eyes are close to your cheek tone.',
mid: 'Some darkness under the eyes.',
bad: 'Under-eyes are noticeably darker than your cheeks.',
tip: 'Sleep 7+ hours, cut salt and alcohol at night, and use sunscreen around the eyes. Some darkness is genetic and will not fully go away.',
},
redness: {
label: 'Redness',
good: 'Even tone, little redness.',
mid: 'Some redness on the cheeks or nose.',
bad: 'Clear redness on the cheeks or nose.',
tip: 'Use gentle, fragrance-free products, avoid hot water and harsh scrubs, and wear sunscreen. If redness stays for weeks, have a dermatologist look at it.',
},
evenness: {
label: 'Evenness',
good: 'Skin tone looks even.',
mid: 'Some uneven patches or marks.',
bad: 'Uneven tone, marks or spots.',
tip: 'Daily sunscreen stops marks getting darker. Do not pick. Niacinamide can help fade marks over a few months.',
},
shine: {
label: 'Oil and shine',
good: 'Little shine.',
mid: 'Some shine on the forehead or nose.',
bad: 'Lots of shine on the forehead or nose.',
tip: 'Use a gentle cleanser twice a day and a light, oil-free moisturizer. Do not over-wash, because it can make oiliness worse.',
},
eye_texture: {
label: 'Under-eye texture',
good: 'Under-eye skin looks smooth.',
mid: 'Some fine texture under the eyes.',
bad: 'Visible fine lines or texture under the eyes.',
tip: 'Sleep, sunscreen and a moisturizer around the eyes. Do not rub your eyes.',
},
pores: {
label: 'Pores and blackheads',
good: 'Pores look small and clear.',
mid: 'Some visible pores or blackheads.',
bad: 'Many visible pores or blackheads.',
tip: 'Salicylic acid (BHA) 2–3 times a week, cleanse every night, and do not squeeze. Pore size is partly genetic.',
},
nose_oil: {
label: 'Nose oil',
good: 'Little oil on the nose.',
mid: 'Some oil on the nose.',
bad: 'Very oily nose.',
tip: 'Cleanse at night, use an oil-free moisturizer, and blot during the day instead of washing again.',
},
};

function item(key: SkinKey, source: SkinSource, value: number, score: number): SkinItem {
const c = COPY[key];
return {
key,
label: c.label,
source,
value: Math.round(value * 1000) / 1000,
score,
verdict: score >= 7.5 ? c.good : score >= 5 ? c.mid : c.bad,
tip: c.tip,
};
}

/* ---------- readers ---------- */
async function readFront(src: string, lm: Pt[]): Promise<SkinItem[]> {
const img = await loadImage(src);
const W = img.naturalWidth, H = img.naturalHeight;
const P = (i: number) => ({ x: lm[i].x * W, y: lm[i].y * H });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const eyeW = (dist(P(33), P(133)) + dist(P(362), P(263))) / 2;
if (eyeW < 15) return [];

// Under-eye: a band just below each lower lid
const underEye = (outer: number, inner: number, lid: number): Rect => {
const xs = [P(outer).x, P(inner).x];
return { x: Math.min(...xs), y: P(lid).y + eyeW * 0.18, w: Math.abs(xs[1] - xs[0]), h: eyeW * 0.35 };
};
const box = (c: Pt, w: number, h: number): Rect => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });

const ueL = patchFrom(img, underEye(33, 133, 145), 64, 24);
const ueR = patchFrom(img, underEye(263, 362, 374), 64, 24);
const chL = patchFrom(img, box(P(50), eyeW * 0.6, eyeW * 0.6), 48, 48);
const chR = patchFrom(img, box(P(280), eyeW * 0.6, eyeW * 0.6), 48, 48);
const fh = patchFrom(img, box(P(151), eyeW * 1.2, eyeW * 0.45), 96, 36);
const nose = patchFrom(img, box(P(4), eyeW * 0.45, eyeW * 0.35), 40, 32);
if (!ueL || !ueR || !chL || !chR || !fh || !nose) return [];

const cheekL = (mean(chL.L) + mean(chR.L)) / 2;
const underL = (mean(ueL.L) + mean(ueR.L)) / 2;
const ratio = underL / Math.max(cheekL, 1);

const cheekA = (mean(chL.a) + mean(chR.a) + mean(nose.a)) / 3;
const redDelta = cheekA - mean(fh.a);

const cov = ((std(chL.L) / Math.max(mean(chL.L), 1)) + (std(chR.L) / Math.max(mean(chR.L), 1))) / 2;

const shine = (shineFraction(fh) + shineFraction(nose)) / 2;

return [
item('dark_circles', 'front', ratio, scoreBetween(-ratio, -0.97, -0.82)),
item('redness', 'front', redDelta, scoreBetween(redDelta, 1, 8)),
item('evenness', 'front', cov, scoreBetween(cov, 0.035, 0.1)),
item('shine', 'front', shine, scoreBetween(shine, 0.01, 0.1)),
];
}

/** Eye close-up: the user lines the eye up in the top half of the guide box; under-eye skin is the lower part. */
async function readEye(src: string): Promise<SkinItem[]> {
const img = await loadImage(src);
const sq = centerSquare(img);
const under = patchFrom(img, sub(sq, 0.2, 0.55, 0.6, 0.22), 160, 60);
if (!under) return [];
const tex = texture(under);
return [item('eye_texture', 'eye', tex, scoreBetween(tex, 1.2, 3.5))];
}

/** Nose close-up: the nose fills the middle of the guide box. */
async function readNose(src: string): Promise<SkinItem[]> {
const img = await loadImage(src);
const sq = centerSquare(img);
const p = patchFrom(img, sub(sq, 0.3, 0.3, 0.4, 0.4), 200, 200);
if (!p) return [];
const spots = spotFraction(p);
const oil = shineFraction(p);
return [
item('pores', 'nose', spots, scoreBetween(spots, 0.01, 0.08)),
item('nose_oil', 'nose', oil, scoreBetween(oil, 0.01, 0.1)),
];
}

export async function analyzeSkin(input: {
front: string; // the image the landmarks belong to (the cropped face if available)
landmarks?: Pt[];
eye?: string | null;
nose?: string | null;
}): Promise<SkinReading | null> {
const parts = await Promise.all([
input.landmarks && input.landmarks.length > 300 ? readFront(input.front, input.landmarks).catch(() => []) : Promise.resolve([]),
input.eye ? readEye(input.eye).catch(() => []) : Promise.resolve([]),
input.nose ? readNose(input.nose).catch(() => []) : Promise.resolve([]),
]);
const items = parts.flat().sort((a, b) => a.score - b.score);
if (items.length === 0) return null;
const score = Math.round((items.reduce((s, i) => s + i.score, 0) / items.length) * 10) / 10;
return { score, items };
}

