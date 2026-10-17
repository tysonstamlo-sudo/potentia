/**
* Potentia face analysis — real landmark-ratio engine.
*
* Runs fully in the browser with MediaPipe FaceLandmarker (478 landmarks).
* Photos never leave the device.
*
* HONESTY NOTES (also shown to the user in the UI):
* - Ratios are a weak proxy for attractiveness. Skin, hair, grooming,
* expression, body fat and style are NOT measured here.
* - Ideals / tolerances below are PROVISIONAL (from common
* "golden-ratio / neoclassical canon" style references) and have not been
* calibrated against a rated dataset yet. Tune them in METRIC_DEFS.
*/

export type Gender = 'male' | 'female';

export type GroupKey = 'symmetry' | 'proportions' | 'eyes' | 'jaw';

export type Measurement = {
key: string;
label: string;
group: GroupKey;
value: number; // measured
ideal: number; // target
tolerance: number; // deviation at which score halves
unit: 'ratio' | 'deg' | 'pct';
score: number; // 0..10
weight: number;
note: string;
};

export type OverlayPoint = { x: number; y: number }; // normalised 0..1 in the source image

export type FaceAnalysis = {
overall: number; // 0..10, one decimal
potential: number; // estimate, 0..10
spread: number; // std-dev of metric scores (consistency)
groups: Record<GroupKey, number>;
measurements: Measurement[];
levers: string[]; // weakest metrics, human readable
overlay: OverlayPoint[];
tier: 'Foundation' | 'Ascending' | 'Refined' | 'Elite';
croppedImage?: string; // tight face crop the measurements were taken on
};

export type FaceAnalysisErrorCode =
| 'NO_FACE'
| 'NOT_FRONTAL'
| 'TOO_SMALL'
| 'LOAD_FAILED'
| 'IMAGE_FAILED';

export class FaceAnalysisError extends Error {
code: FaceAnalysisErrorCode;
constructor(code: FaceAnalysisErrorCode, message: string) {
super(message);
this.code = code;
this.name = 'FaceAnalysisError';
}
}

type LM = { x: number; y: number; z?: number };
type P = { x: number; y: number };

/* ---------- landmark indices (MediaPipe canonical face mesh) ---------- */
const I = {
// eyes: "R" = subject's right (image left)
rOuter: 33,
rInner: 133,
lInner: 362,
lOuter: 263,
rIris: 468,
lIris: 473,
rUp: 159,
rLow: 145,
lUp: 386,
lLow: 374,
// nose
noseTip: 1,
subnasal: 2,
rAla: 129,
lAla: 358,
glabella: 9,
nasion: 168,
// mouth
rMouth: 61,
lMouth: 291,
upperLipTop: 0,
upperLipIn: 13,
lowerLipIn: 14,
lowerLipBot: 17,
// face outline
forehead: 10,
chin: 152,
rZygo: 234,
lZygo: 454,
rGonion: 172,
lGonion: 397,
// brows
rBrow: 105,
lBrow: 334,
};

/* ---------- helpers ---------- */
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function scoreOf(value: number, ideal: number, tol: number) {
const dev = Math.abs(value - ideal);
return clamp(10 * Math.exp(-Math.LN2 * Math.pow(dev / tol, 2)), 0, 10);
}

type MetricDef = {
key: string;
label: string;
group: GroupKey;
unit: Measurement['unit'];
ideal: (g: Gender) => number;
tol: (g: Gender) => number;
weight: number;
note: string; // what "off" means
compute: (p: Pts) => number;
};

type Pts = {
g: (i: number) => P; // roll-corrected pixel-space point
faceW: number; // bizygomatic width
faceH: number; // forehead→chin
midX: number; // facial midline x (from nasion/chin)
};

/* ---------- metric definitions (PROVISIONAL ideals) ---------- */
const METRIC_DEFS: MetricDef[] = [
// ---- Symmetry
{
key: 'sym_landmarks',
label: 'Left–right symmetry',
group: 'symmetry',
unit: 'pct',
ideal: () => 0,
tol: () => 3.5,
weight: 1.6,
note: 'Paired features sit at different distances from your midline.',
compute: (p) => {
const pairs: [number, number][] = [
[I.rOuter, I.lOuter],
[I.rInner, I.lInner],
[I.rMouth, I.lMouth],
[I.rZygo, I.lZygo],
[I.rGonion, I.lGonion],
[I.rAla, I.lAla],
[I.rBrow, I.lBrow],
];
let sum = 0;
for (const [a, b] of pairs) {
const da = Math.abs(p.g(a).x - p.midX);
const db = Math.abs(p.g(b).x - p.midX);
sum += Math.abs(da - db);
}
return ((sum / pairs.length) / p.faceW) * 100;
},
},
{
key: 'sym_vertical',
label: 'Eye / mouth level',
group: 'symmetry',
unit: 'pct',
ideal: () => 0,
tol: () => 3,
weight: 0.8,
note: 'One eye or mouth corner sits higher than the other.',
compute: (p) => {
const eye = Math.abs(p.g(I.rOuter).y - p.g(I.lOuter).y);
const mouth = Math.abs(p.g(I.rMouth).y - p.g(I.lMouth).y);
return (((eye + mouth) / 2) / p.faceW) * 100;
},
},

// ---- Proportions
{
key: 'mid_lower',
label: 'Midface : lower face',
group: 'proportions',
unit: 'ratio',
ideal: () => 1.0,
tol: () => 0.2,
weight: 1.2,
note: 'Midface (brow→nose base) vs lower face (nose base→chin) are out of balance.',
compute: (p) =>
(p.g(I.subnasal).y - p.g(I.glabella).y) / (p.g(I.chin).y - p.g(I.subnasal).y),
},
{
key: 'lower_split',
label: 'Upper lip : chin split',
group: 'proportions',
unit: 'ratio',
ideal: () => 0.55,
tol: () => 0.12,
weight: 1.0,
note: 'Nose-base→mouth vs mouth→chin is far from the 1 : 2 canon.',
compute: (p) => {
const mouthY = (p.g(I.upperLipIn).y + p.g(I.lowerLipIn).y) / 2;
return (mouthY - p.g(I.subnasal).y) / (p.g(I.chin).y - mouthY);
},
},
{
key: 'face_hw',
label: 'Face height : width',
group: 'proportions',
unit: 'ratio',
ideal: (g) => (g === 'male' ? 1.27 : 1.33),
tol: () => 0.12,
weight: 1.2,
note: 'Face is notably longer or shorter than typical ideal proportions.',
compute: (p) => p.faceH / p.faceW,
},
{
key: 'nose_mouth',
label: 'Mouth : nose width',
group: 'proportions',
unit: 'ratio',
ideal: () => 1.28,
tol: () => 0.22,
weight: 0.8,
note: 'Mouth width vs nose width is off the usual 1.5 relationship.',
compute: (p) => dist(p.g(I.rMouth), p.g(I.lMouth)) / dist(p.g(I.rAla), p.g(I.lAla)),
},
{
key: 'lip_ratio',
label: 'Upper : lower lip',
group: 'proportions',
unit: 'ratio',
ideal: () => 0.62,
tol: () => 0.15,
weight: 0.6,
note: 'Lip fullness is unbalanced (also depends on expression).',
compute: (p) =>
(p.g(I.upperLipIn).y - p.g(I.upperLipTop).y) /
Math.max(1e-6, p.g(I.lowerLipBot).y - p.g(I.lowerLipIn).y),
},

// ---- Eyes
{
key: 'canthal_tilt',
label: 'Canthal tilt',
group: 'eyes',
unit: 'deg',
ideal: (g) => (g === 'male' ? 5 : 6),
tol: () => 4,
weight: 1.3,
note: 'Outer eye corners sit lower than ideal (negative/neutral tilt).',
compute: (p) => {
const tilt = (inner: P, outer: P) =>
(Math.atan2(inner.y - outer.y, Math.abs(outer.x - inner.x)) * 180) / Math.PI;
const r = tilt(p.g(I.rInner), p.g(I.rOuter));
const l = tilt(p.g(I.lInner), p.g(I.lOuter));
return (r + l) / 2;
},
},
{
key: 'eye_spacing',
label: 'Eye spacing',
group: 'eyes',
unit: 'ratio',
ideal: () => 1.3,
tol: () => 0.2,
weight: 0.7,
note: 'Gap between eyes differs from one eye-width (set too wide or too close).',
compute: (p) => {
const gap = dist(p.g(I.rInner), p.g(I.lInner));
const w = (dist(p.g(I.rInner), p.g(I.rOuter)) + dist(p.g(I.lInner), p.g(I.lOuter))) / 2;
return gap / w;
},
},
{
key: 'eye_to_face',
label: 'Eye width : face width',
group: 'eyes',
unit: 'ratio',
ideal: () => 0.2,
tol: () => 0.03,
weight: 0.8,
note: 'Eyes read small or large relative to face width.',
compute: (p) =>
((dist(p.g(I.rInner), p.g(I.rOuter)) + dist(p.g(I.lInner), p.g(I.lOuter))) / 2) / p.faceW,
},
{
key: 'nose_icd',
label: 'Nose width : eye gap',
group: 'eyes',
unit: 'ratio',
ideal: () => 1.15,
tol: () => 0.18,
weight: 0.9,
note: 'Nose is wider or narrower than the gap between your eyes.',
compute: (p) => dist(p.g(I.rAla), p.g(I.lAla)) / dist(p.g(I.rInner), p.g(I.lInner)),
},

// ---- Jaw
{
key: 'jaw_cheek',
label: 'Jaw : cheekbone width',
group: 'jaw',
unit: 'ratio',
ideal: (g) => (g === 'male' ? 0.8 : 0.76),
tol: () => 0.06,
weight: 1.4,
note: 'Jaw is narrow (or very wide) compared to the cheekbones.',
compute: (p) => dist(p.g(I.rGonion), p.g(I.lGonion)) / p.faceW,
},
{
key: 'chin_width',
label: 'Chin height : face',
group: 'jaw',
unit: 'ratio',
ideal: (g) => (g === 'male' ? 0.2 : 0.18),
tol: () => 0.035,
weight: 0.9,
note: 'Lower lip→chin length is short or long relative to face height.',
compute: (p) => (p.g(I.chin).y - p.g(I.lowerLipBot).y) / p.faceH,
},
];

const GROUP_LABELS: Record<GroupKey, string> = {
symmetry: 'Symmetry',
proportions: 'Proportions',
eyes: 'Eyes',
jaw: 'Jaw',
};
export { GROUP_LABELS };

/* ---------- pure analysis (testable without the browser) ---------- */
export function analyzeLandmarks(
lms: LM[],
imgW: number,
imgH: number,
gender: Gender = 'male'
): FaceAnalysis {
if (!lms || lms.length < 468) throw new FaceAnalysisError('NO_FACE', 'No face landmarks found.');

// pixel space (keeps aspect ratio correct)
const raw = (i: number): P => ({ x: lms[i].x * imgW, y: lms[i].y * imgH });

// size gate
const rawW = dist(raw(I.rZygo), raw(I.lZygo));
if (rawW < Math.min(imgW, imgH) * 0.22) {
throw new FaceAnalysisError('TOO_SMALL', 'Face is too small in the frame.');
}

// yaw gate: nose tip should sit near the middle between the cheek edges
const dl = Math.abs(raw(I.noseTip).x - raw(I.rZygo).x);
const dr = Math.abs(raw(I.lZygo).x - raw(I.noseTip).x);
const yawRatio = Math.min(dl, dr) / Math.max(dl, dr);
if (yawRatio < 0.72) {
throw new FaceAnalysisError('NOT_FRONTAL', 'Face is turned. Look straight at the camera.');
}

// roll correction using eye centres
const rEye = lms.length > 473 ? raw(I.rIris) : mid(raw(I.rOuter), raw(I.rInner));
const lEye = lms.length > 473 ? raw(I.lIris) : mid(raw(I.lOuter), raw(I.lInner));
const roll = Math.atan2(lEye.y - rEye.y, lEye.x - rEye.x);
const c = Math.cos(-roll);
const s = Math.sin(-roll);
const origin = mid(rEye, lEye);
const g = (i: number): P => {
const p = raw(i);
const dx = p.x - origin.x;
const dy = p.y - origin.y;
return { x: dx * c - dy * s, y: dx * s + dy * c };
};

const faceW = dist(g(I.rZygo), g(I.lZygo));
const faceH = Math.abs(g(I.chin).y - g(I.forehead).y);
const midX = (g(I.nasion).x + g(I.chin).x) / 2;
const pts: Pts = { g, faceW, faceH, midX };

const measurements: Measurement[] = METRIC_DEFS.map((d) => {
const value = d.compute(pts);
const ideal = d.ideal(gender);
const tolerance = d.tol(gender);
return {
key: d.key,
label: d.label,
group: d.group,
value,
ideal,
tolerance,
unit: d.unit,
score: scoreOf(value, ideal, tolerance),
weight: d.weight,
note: d.note,
};
});

const wsum = measurements.reduce((a, m) => a + m.weight, 0);
const mean = measurements.reduce((a, m) => a + m.score * m.weight, 0) / wsum;
const variance =
measurements.reduce((a, m) => a + m.weight * Math.pow(m.score - mean, 2), 0) / wsum;
const spread = Math.sqrt(variance);

// Honest mapping: raw metric means run high (most faces are "kind of close"
// on most ratios), so compress with a power curve. PROVISIONAL.
// Recentred 2026-10-18 after 3 real scans (eye spacing read ~1.31 on all three).
const overallRaw = 1 + 9 * Math.pow(mean / 10, 4.0);
const overall = Math.round(clamp(overallRaw, 1, 10) * 10) / 10;

// Potential (estimate): fixable-ish upside only. Ratios barely change; this
// reflects grooming/leanness/skin upside, shrinking as overall rises.
const potential =
Math.round(clamp(overall + Math.min(1.4, (10 - overall) * 0.18 + 0.2), 1, 10) * 10) / 10;

const groups = {} as Record<GroupKey, number>;
(Object.keys(GROUP_LABELS) as GroupKey[]).forEach((k) => {
const ms = measurements.filter((m) => m.group === k);
const w = ms.reduce((a, m) => a + m.weight, 0);
const mn = ms.reduce((a, m) => a + m.score * m.weight, 0) / w;
groups[k] = Math.round(clamp(1 + 9 * Math.pow(mn / 10, 4.0), 1, 10) * 10) / 10;
});

const levers = [...measurements]
.sort((a, b) => a.score - b.score)
.slice(0, 3)
.filter((m) => m.score < 7)
.map((m) => m.note);

const tier: FaceAnalysis['tier'] =
overall >= 8 ? 'Elite' : overall >= 6.5 ? 'Refined' : overall >= 5 ? 'Ascending' : 'Foundation';

const overlayIdx = [
I.rOuter, I.rInner, I.lInner, I.lOuter, I.rIris, I.lIris, I.noseTip, I.subnasal,
I.rAla, I.lAla, I.rMouth, I.lMouth, I.upperLipTop, I.lowerLipBot, I.forehead, I.chin,
I.rZygo, I.lZygo, I.rGonion, I.lGonion, I.rBrow, I.lBrow, I.glabella,
].filter((i) => i < lms.length);
const overlay = overlayIdx.map((i) => ({ x: lms[i].x, y: lms[i].y }));

return { overall, potential, spread, groups, measurements, levers, overlay, tier };
}

/* ---------- browser pipeline ---------- */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarkerPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getLandmarker(): Promise<any> {
if (landmarkerPromise) return landmarkerPromise;
landmarkerPromise = (async () => {
try {
const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
const make = (delegate: 'GPU' | 'CPU') =>
FaceLandmarker.createFromOptions(fileset, {
baseOptions: { modelAssetPath: MODEL_URL, delegate },
runningMode: 'IMAGE',
numFaces: 4,
});
try {
return await make('GPU');
} catch {
return await make('CPU');
}
} catch (e) {
landmarkerPromise = null;
throw new FaceAnalysisError('LOAD_FAILED', 'Could not load the face model. Check your connection.');
}
})();
return landmarkerPromise;
}

/** Start loading the model early (e.g. when the Scan tab opens). */
export function preloadFaceModel() {
getLandmarker().catch(() => {});
}

function loadImage(src: string): Promise<HTMLImageElement> {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = () => reject(new FaceAnalysisError('IMAGE_FAILED', 'Could not read that image.'));
img.src = src;
});
}

function faceArea(lms: LM[]) {
let minX = 1, maxX = 0, minY = 1, maxY = 0;
for (const p of lms) {
if (p.x < minX) minX = p.x;
if (p.x > maxX) maxX = p.x;
if (p.y < minY) minY = p.y;
if (p.y > maxY) maxY = p.y;
}
return { minX, maxX, minY, maxY, area: (maxX - minX) * (maxY - minY) };
}

export async function analyzeFace(imageDataUrl: string, gender: Gender = 'male'): Promise<FaceAnalysis> {
const img = await loadImage(imageDataUrl);
const landmarker = await getLandmarker();
const W = img.naturalWidth;
const H = img.naturalHeight;

// Pass 1: find the largest face in the photo (ignores people in the background)
const res1 = landmarker.detect(img);
const faces: LM[][] = res1?.faceLandmarks ?? [];
if (!faces.length) throw new FaceAnalysisError('NO_FACE', 'No face found. Use a clear, front-facing photo.');
const main = faces.reduce((a, b) => (faceArea(b).area > faceArea(a).area ? b : a));

// Pass 2: crop a square around that face and re-detect for sharper landmarks
const b = faceArea(main);
const cx = ((b.minX + b.maxX) / 2) * W;
const cy = ((b.minY + b.maxY) / 2) * H;
const side = Math.min(Math.max((b.maxX - b.minX) * W, (b.maxY - b.minY) * H) * 1.7, Math.max(W, H));
const sx = Math.max(0, Math.min(W - Math.min(side, W), cx - side / 2));
const sy = Math.max(0, Math.min(H - Math.min(side, H), cy - side / 2));
const sw = Math.min(side, W - sx);
const sh = Math.min(side, H - sy);

const canvas = document.createElement('canvas');
const out = 768;
canvas.width = out;
canvas.height = Math.round(out * (sh / sw));
const ctx = canvas.getContext('2d');
if (!ctx) return analyzeLandmarks(main, W, H, gender);
ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

const res2 = landmarker.detect(canvas);
const lms2: LM[] | undefined = res2?.faceLandmarks?.[0];
if (!lms2) return analyzeLandmarks(main, W, H, gender);

const analysis = analyzeLandmarks(lms2, canvas.width, canvas.height, gender);
analysis.croppedImage = canvas.toDataURL('image/jpeg', 0.92);
return analysis;
}

export function formatValue(m: Measurement): string {
if (m.unit === 'deg') return `${m.value.toFixed(1)}°`;
if (m.unit === 'pct') return `${m.value.toFixed(1)}%`;
return m.value.toFixed(2);
}
export function formatIdeal(m: Measurement): string {
if (m.unit === 'deg') return `${m.ideal.toFixed(0)}°`;
if (m.unit === 'pct') return `≈ 0%`;
return m.ideal.toFixed(2);
}

