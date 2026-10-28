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
landmarks?: OverlayPoint[]; // all landmarks, normalized 0..1 to the analysed image
pose?: { yaw: number; pitch: number; roll: number }; // head angle in degrees (0 = straight at the camera)
frames?: number; // how many photos were combined into this result
};

export type FaceAnalysisErrorCode =
| 'NO_FACE'
| 'NOT_FRONTAL'
| 'EXPRESSION'
| 'TOO_CLOSE'
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

function scoreDev(dev: number, tol: number) {
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
// Optional custom deviation (e.g. a band of acceptable values instead of one ideal)
dev?: (value: number, ideal: number) => number;
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
tol: () => 2.8,
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
tol: () => 1.6,
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
ideal: () => 0.58,
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
ideal: () => 1.15,
tol: () => 0.2,
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
tol: () => 3,
weight: 1.3,
note: 'Outer eye corners sit lower than ideal (negative/neutral tilt).',
// Band: ideal-1 .. ideal+4 degrees counts as ideal. Only tilt outside it is penalised.
dev: (v, ideal) => Math.max(0, ideal - 1 - v, v - (ideal + 4)),
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
tol: () => 0.14,
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
tol: () => 0.018,
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
tol: () => 0.045,
weight: 1.4,
note: 'Jaw is narrow (or very wide) compared to the cheekbones.',
compute: (p) => dist(p.g(I.rGonion), p.g(I.lGonion)) / p.faceW,
},
{
key: 'chin_width',
label: 'Chin height : face',
group: 'jaw',
unit: 'ratio',
ideal: () => 0.17,
tol: () => 0.03,
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
score: scoreDev(d.dev ? d.dev(value, ideal) : Math.abs(value - ideal), tolerance),
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
// Tuned on 171 real camera scans (29 Oct 2026): average stays ~5.5, top tiers are rare.
const overallRaw = 1 + 9 * Math.pow(mean / 10, 3.2);
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

const landmarks = lms.map((p) => ({ x: p.x, y: p.y }));
return { overall, potential, spread, groups, measurements, levers, overlay, tier, landmarks };
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
outputFaceBlendshapes: true,
outputFacialTransformationMatrixes: true,
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

// Quality gates: the same face should give the same score, so reject photos that distort it
const pose = headPose(res2?.facialTransformationMatrixes?.[0]?.data);
if (pose && (Math.abs(pose.yaw) > 14 || Math.abs(pose.pitch) > 18)) {
throw new FaceAnalysisError('NOT_FRONTAL', 'Look straight at the camera with your chin level.');
}
const shapes = blendshapeMap(res2?.faceBlendshapes?.[0]?.categories);
if (shapes) {
const smile = ((shapes.mouthSmileLeft ?? 0) + (shapes.mouthSmileRight ?? 0)) / 2;
const blink = ((shapes.eyeBlinkLeft ?? 0) + (shapes.eyeBlinkRight ?? 0)) / 2;
if ((shapes.jawOpen ?? 0) > 0.18 || smile > 0.4 || blink > 0.75) {
throw new FaceAnalysisError('EXPRESSION', 'Keep a neutral face: mouth closed, no smile, eyes open.');
}
}
// Too close to the camera = lens distortion (nose looks bigger, face narrower)
if (b.maxX - b.minX > 0.8) {
throw new FaceAnalysisError('TOO_CLOSE', 'Hold the phone a little further away.');
}

const analysis = analyzeLandmarks(lms2, canvas.width, canvas.height, gender);
analysis.croppedImage = canvas.toDataURL('image/jpeg', 0.92);
if (pose) analysis.pose = pose;
analysis.frames = 1;
return analysis;
}

/** Head angle from MediaPipe's 4x4 face transform (column-major). */
function headPose(m?: number[] | Float32Array) {
if (!m || m.length < 16) return null;
const r00 = m[0], r10 = m[1], r20 = m[2], r21 = m[6], r22 = m[10];
const deg = 180 / Math.PI;
// fold angles into -90..90 so either axis convention gives "0 = straight on"
const fold = (a: number) => (a > 90 ? a - 180 : a < -90 ? a + 180 : a);
return {
yaw: fold(Math.asin(Math.max(-1, Math.min(1, -r20))) * deg),
pitch: fold(Math.atan2(r21, r22) * deg),
roll: fold(Math.atan2(r10, r00) * deg),
};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blendshapeMap(cats?: any[]): Record<string, number> | null {
if (!cats || !cats.length) return null;
const out: Record<string, number> = {};
for (const c of cats) out[c.categoryName] = c.score;
return out;
}

const median = (xs: number[]) => {
const s = [...xs].sort((a, b) => a - b);
const m = Math.floor(s.length / 2);
return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
* Analyse several photos of the same face and combine them.
* Uses the median of every measurement, so one bad frame can't swing the score.
*/
export async function analyzeFaceBurst(images: string[], gender: Gender = 'male'): Promise<FaceAnalysis> {
const ok: FaceAnalysis[] = [];
let firstError: unknown = null;
for (const img of images) {
try {
ok.push(await analyzeFace(img, gender));
} catch (e) {
if (!firstError) firstError = e;
}
}
if (!ok.length) throw firstError ?? new FaceAnalysisError('NO_FACE', 'No face found.');
if (ok.length === 1) return ok[0];

const overall = Math.round(median(ok.map(a => a.overall)) * 10) / 10;
// show the frame closest to the median as the photo
const base = ok.reduce((a, b) => (Math.abs(b.overall - overall) < Math.abs(a.overall - overall) ? b : a));
const groups = { ...base.groups };
(Object.keys(groups) as GroupKey[]).forEach(k => {
groups[k] = Math.round(median(ok.map(a => a.groups[k])) * 10) / 10;
});
const measurements = base.measurements.map(m => {
const same = ok.map(a => a.measurements.find(x => x.key === m.key)).filter(Boolean) as Measurement[];
return { ...m, value: median(same.map(x => x.value)), score: median(same.map(x => x.score)) };
});
return {
...base,
overall,
potential: Math.round(median(ok.map(a => a.potential)) * 10) / 10,
groups,
measurements,
frames: ok.length,
};
}

export function formatValue(m: Measurement): string {
if (m.unit === 'deg') return `${m.value.toFixed(1)}°`;
if (m.unit === 'pct') return `${m.value.toFixed(1)}%`;
return m.value.toFixed(2);
}
export function formatIdeal(m: Measurement): string {
if (m.unit === 'deg') return `${(m.ideal - 1).toFixed(0)}–${(m.ideal + 4).toFixed(0)}°`;
if (m.unit === 'pct') return `≈ 0%`;
return m.ideal.toFixed(2);
}

/* ---------- looksmaxxing tier (shown on the result) ---------- */
export type FaceTier = { key: string; label: string; full: string; min: number };

// Tier lines set from real user data (29 Oct 2026). Roughly what share of camera scans land in each:
// Sub 3 ~2% · Sub 5 ~16% · LTN ~23% · MTN ~29% · HTN ~22% · Chadlite ~7% · Chad ~1.5% · True Adam/Eve <0.1% (and needs 3 scans)
const MALE_TIERS: FaceTier[] = [
{ key: 'sub3', label: 'Sub 3', full: 'Sub 3', min: 0 },
{ key: 'sub5', label: 'Sub 5', full: 'Sub 5', min: 3.5 },
{ key: 'ltn', label: 'LTN', full: 'Low-tier normie', min: 4.6 },
{ key: 'mtn', label: 'MTN', full: 'Mid-tier normie', min: 5.3 },
{ key: 'htn', label: 'HTN', full: 'High-tier normie', min: 6.1 },
{ key: 'chadlite', label: 'Chadlite', full: 'Chadlite', min: 7.0 },
{ key: 'chad', label: 'Chad', full: 'Chad', min: 7.8 },
{ key: 'trueadam', label: 'True Adam', full: 'True Adam', min: 8.7 },
];

const FEMALE_TIERS: FaceTier[] = [
{ key: 'sub3', label: 'Sub 3', full: 'Sub 3', min: 0 },
{ key: 'sub5', label: 'Sub 5', full: 'Sub 5', min: 3.5 },
{ key: 'ltb', label: 'LTB', full: 'Low-tier becky', min: 4.6 },
{ key: 'mtb', label: 'MTB', full: 'Mid-tier becky', min: 5.3 },
{ key: 'htb', label: 'HTB', full: 'High-tier becky', min: 6.1 },
{ key: 'stacylite', label: 'Stacylite', full: 'Stacylite', min: 7.0 },
{ key: 'stacy', label: 'Stacy', full: 'Stacy', min: 7.8 },
{ key: 'trueeve', label: 'True Eve', full: 'True Eve', min: 8.7 },
];

/** The top tier (True Adam / True Eve) needs this many camera scans averaged, so one lucky photo can't get it. */
export const TOP_TIER_MIN_SCANS = 3;

export function faceTiers(gender: Gender) {
return gender === 'female' ? FEMALE_TIERS : MALE_TIERS;
}

/** Which tier an overall score (1–10) falls in. scanCount = how many camera scans the score is averaged from. */
export function faceTier(overall: number, gender: Gender, scanCount: number = TOP_TIER_MIN_SCANS): FaceTier {
const tiers = faceTiers(gender);
let i = 0;
tiers.forEach((x, j) => {
if (overall >= x.min) i = j;
});
// One great photo isn't enough for the very top: it has to hold up over several scans
if (i === tiers.length - 1 && scanCount < TOP_TIER_MIN_SCANS) i = tiers.length - 2;
return tiers[i];
}

/** True when the score is high enough for the top tier but it still needs more scans to confirm. */
export function topTierPending(overall: number, gender: Gender, scanCount: number) {
const tiers = faceTiers(gender);
return overall >= tiers[tiers.length - 1].min && scanCount < TOP_TIER_MIN_SCANS;
}

