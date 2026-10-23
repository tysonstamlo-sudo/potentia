'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlanView } from './FullPlan';
import { buildPlan } from '../../lib/improvementPlan';
import { analyzeSkin, type SkinReading } from '../../lib/skinAnalysis';
import { useLang } from '../../lib/i18n';
import { buildScanFeedback, type ScanFeedback, type ScanSnapshot } from '../../lib/scanFeedback';
import {
analyzeFace,
preloadFaceModel,
FaceAnalysisError,
GROUP_LABELS,
formatValue,
formatIdeal,
faceTier,
faceTiers,
type FaceAnalysis,
type GroupKey,
} from '../../lib/faceAnalysis';
import {
Camera,
Upload,
Sparkles,
Lock,
Crown,
RefreshCw,
X,
ImageIcon,
TrendingUp,
Share2,
Gauge,
AlertTriangle,
Ruler,
Target,
} from 'lucide-react';

type FaceScanProps = {
isPremium: boolean;
onGoPremium: () => void;
};

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

const accentCardStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.3))',
border: '1px solid rgb(var(--gold) / 0.22)',
backdropFilter: 'blur(10px)',
};

function scoreColor(score: number) {
if (score < 4.8) return 'rgb(var(--muted))';
if (score < 6.5) return 'rgb(var(--gold) / 0.55)';
if (score < 8) return 'rgb(var(--gold) / 0.8)';
return 'rgb(var(--gold))';
}

function verdict(score: number) {
if (score >= 8) return 'Exceptional structure. Few measurements deviate from the ideal canon.';
if (score >= 6.5) return 'Above average structure. A few measurements are pulling the score down.';
if (score >= 5) return 'Average structure. Several measurements sit away from the ideal ranges.';
if (score >= 3.5) return 'Below average structure. Multiple measurements deviate notably from the ideal.';
return 'Significant deviation on most measurements. Structure is the weakest part of your reading.';
}

const ERROR_COPY: Record<string, string> = {
NO_FACE: 'No face detected. Use a clear, well-lit, front-facing photo with your whole face visible.',
NOT_FRONTAL: 'Your face is turned. Look straight at the camera, chin level, and try again.',
TOO_SMALL: 'Your face is too small in the frame. Move closer or crop tighter.',
LOAD_FAILED: 'Could not load the face model. Check your connection and try again.',
IMAGE_FAILED: 'That image could not be read. Try a different photo.',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type Step = 'front' | 'eye' | 'nose';
const STEP_COPY: Record<Step, { n: number; title: string; how: string }> = {
front: { n: 1, title: 'Front face', how: 'Look straight at the camera, face the light, neutral face, no glasses.' },
eye: { n: 2, title: 'Eye close-up', how: 'Hold the phone about 15 cm away. One eye in the top box, the skin under it in the bottom box.' },
nose: { n: 3, title: 'Nose close-up', how: 'Fill the box with your nose. Good light, no flash, no filter.' },
};

export default function FaceScan({ isPremium, onGoPremium }: FaceScanProps) {
const { t } = useLang();
// translate the auto-built progress tags, e.g. "Jaw up 1.0" / "Eye spacing improved"
const tTag = (w: string) => {
const m = w.match(/^(.*) (up|down) ([\d.]+)$/);
if (m) return t(m[2] === 'up' ? '{g} up {d}' : '{g} down {d}', { g: t(m[1]), d: m[3] });
const i = w.match(/^(.*) improved$/);
if (i) return t('{m} improved', { m: t(i[1]) });
return t(w);
};
const [gender, setGender] = useState<'male' | 'female'>('male');
// Time of your most recent saved scan. The free limit is checked against the
// database, so clearing browser storage or switching device does not reset it.
const [lastScanAt, setLastScanAt] = useState<number | null>(null);
const [limitLoaded, setLimitLoaded] = useState(false);
const [status, setStatus] = useState<'idle' | 'capture' | 'scanning' | 'result' | 'error'>('idle');
const [result, setResult] = useState<FaceAnalysis | null>(null);
const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
const [skin, setSkin] = useState<SkinReading | null>(null);
const [step, setStep] = useState<Step>('front');
const [shots, setShots] = useState<Partial<Record<Step, string>>>({});
const [source, setSource] = useState<'camera' | 'upload'>('camera');
const [errorMsg, setErrorMsg] = useState('');
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [cameraActive, setCameraActive] = useState(false);

const fileInputRef = useRef<HTMLInputElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);

useEffect(() => {
preloadFaceModel();
const fetchGender = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
setLimitLoaded(true);
return;
}
const { data: last } = await supabase
.from('scans')
.select('created_at')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1);
if (last && last[0]) setLastScanAt(new Date(last[0].created_at).getTime());
setLimitLoaded(true);
const { data: profile } = await supabase
.from('profiles')
.select('gender')
.eq('id', session.user.id)
.single();
if (profile?.gender === 'male' || profile?.gender === 'female') setGender(profile.gender);
};
fetchGender();
return () => {
streamRef.current?.getTracks().forEach(t => t.stop());
};
}, []);

// Full breakdown is open on your local dev server so you can test without paying.
const showFull = isPremium || process.env.NODE_ENV === 'development';

const msUntilNext = lastScanAt ? Math.max(0, lastScanAt + DAY_MS - Date.now()) : 0;
const hoursUntilNext = Math.ceil(msUntilNext / (60 * 60 * 1000));
const canScan = isPremium || !limitLoaded ? true : msUntilNext === 0;
const limitLabel = canScan ? t('1 free scan available') : t('Next scan in {h}h', { h: hoursUntilNext });

const openFilePicker = () => {
if (!canScan) return;
if (status === 'idle') {
setStep('front');
setShots({});
}
setSource('upload');
fileInputRef.current?.click();
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
setImagePreview(reader.result as string);
setStatus('capture');
};
reader.readAsDataURL(file);
e.target.value = '';
};

const startCamera = async () => {
if (!canScan) return;
if (status === 'idle') {
setStep('front');
setShots({});
}
setSource('camera');
try {
const stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
});
streamRef.current = stream;
setCameraActive(true);
setStatus('capture');
setImagePreview(null);
setTimeout(() => {
if (videoRef.current) videoRef.current.srcObject = stream;
}, 100);
} catch {
alert('Camera access denied or unavailable. Try uploading a photo instead.');
}
};

const stopCamera = () => {
streamRef.current?.getTracks().forEach(track => track.stop());
streamRef.current = null;
setCameraActive(false);
};

const capturePhoto = () => {
if (!videoRef.current) return;
const video = videoRef.current;
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
if (ctx) {
ctx.translate(canvas.width, 0);
ctx.scale(-1, 1);
ctx.drawImage(video, 0, 0);
}
setImagePreview(canvas.toDataURL('image/jpeg', 0.92));
stopCamera();
};

const cancelCapture = () => {
stopCamera();
setImagePreview(null);
setShots({});
setStep('front');
setStatus('idle');
};

const retake = () => {
setImagePreview(null);
if (source === 'camera') startCamera();
else fileInputRef.current?.click();
};

// Save this step's photo and move on (or analyse after the last one)
const nextStep = () => {
if (!imagePreview) return;
const updated = { ...shots, [step]: imagePreview };
setShots(updated);
if (step === 'nose') {
runScan(updated);
return;
}
setStep(step === 'front' ? 'eye' : 'nose');
setImagePreview(null);
if (source === 'camera') startCamera();
};

// Analyse with the photos taken so far (close-ups are optional)
const analyzeNow = () => {
const updated = imagePreview ? { ...shots, [step]: imagePreview } : shots;
stopCamera();
setShots(updated);
runScan(updated);
};

const runScan = async (sh: Partial<Record<Step, string>>) => {
if (!sh.front) return;
stopCamera();
setStatus('scanning');
const started = Date.now();
try {
const analysis = await analyzeFace(sh.front, gender);
let skinReading: SkinReading | null = null;
try {
skinReading = await analyzeSkin({
front: analysis.croppedImage ?? sh.front,
landmarks: analysis.landmarks,
eye: sh.eye,
nose: sh.nose,
});
} catch {
/* skin is optional */
}
setSkin(skinReading);
const wait = Math.max(0, 1600 - (Date.now() - started));
await new Promise(r => setTimeout(r, wait));
// Compare with earlier scans before saving this one
let fb: ScanFeedback | null = null;
try {
const { data: { session } } = await supabase.auth.getSession();
if (session) {
const { data: prev } = await supabase
.from('scans')
.select('overall, groups, measurements, created_at')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(5);
fb = buildScanFeedback(
{ overall: analysis.overall, groups: analysis.groups, measurements: analysis.measurements },
(prev ?? []) as ScanSnapshot[],
);
}
} catch {
/* feedback is optional */
}
setFeedback(fb);
setResult(analysis);
setStatus('result');
// Save to history (best-effort; never blocks the result)
try {
const { data: { session } } = await supabase.auth.getSession();
if (session) {
await supabase.from('scans').insert({
user_id: session.user.id,
overall: analysis.overall,
potential: analysis.potential,
groups: analysis.groups,
skin: skinReading,
measurements: analysis.measurements.map(m => ({
key: m.key,
value: Math.round(m.value * 1000) / 1000,
score: Math.round(m.score * 10) / 10,
})),
});
}
} catch {
/* history save failed — ignore */
}
if (!isPremium) setLastScanAt(Date.now());
} catch (e) {
const code = e instanceof FaceAnalysisError ? e.code : 'IMAGE_FAILED';
setErrorMsg(ERROR_COPY[code] || 'Something went wrong. Try again.');
setStatus('error');
}
};

const resetScan = () => {
setStatus('idle');
setResult(null);
setFeedback(null);
setSkin(null);
setShots({});
setStep('front');
setImagePreview(null);
setErrorMsg('');
};

const shareResult = async () => {
if (!result) return;
const text = `Potentia structure reading — Overall ${result.overall}/10, Potential ${result.potential}/10`;
try {
if (navigator.share) await navigator.share({ text, title: 'Potentia' });
else {
await navigator.clipboard.writeText(text);
alert('Copied your reading to clipboard.');
}
} catch {
/* cancelled */
}
};

const primaryBtn = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' } as React.CSSProperties;
const ghostBtn = { background: 'rgb(var(--muted) / 0.1)' } as React.CSSProperties;

return (
<div className="space-y-6 font-body">
<style>{`
@keyframes scanLine {
0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; }
}
@keyframes scanPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
.scan-line {
position: absolute; left: 0; right: 0; height: 2px;
background: linear-gradient(90deg, transparent, rgb(var(--gold)), transparent);
box-shadow: 0 0 12px 2px rgb(var(--gold) / 0.6);
animation: scanLine 2s ease-in-out infinite;
}
.scan-grid {
background-image: linear-gradient(rgb(var(--gold) / 0.08) 1px, transparent 1px),
linear-gradient(90deg, rgb(var(--gold) / 0.08) 1px, transparent 1px);
background-size: 20px 20px; animation: scanPulse 2s ease-in-out infinite;
}
.portrait-ring { filter: drop-shadow(0 0 22px rgb(var(--glow) / 0.3)); }
.score-bar-track { background: rgb(var(--muted) / 0.15); }
.score-bar-fill { transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
`}</style>

{/* Header */}
<div className="flex items-center justify-between p-5 rounded-2xl" style={cardStyle}>
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{t("Reading")}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{t("Facial Structure Scan")}</h2>
</div>
<div
className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-wide"
style={{
background: isPremium ? 'rgb(var(--gold) / 0.12)' : 'rgb(var(--muted) / 0.1)',
color: isPremium ? 'rgb(var(--gold))' : 'rgb(var(--muted))',
}}
>
{isPremium && <Crown className="w-3 h-3" />}
{isPremium ? t('Unlimited') : limitLabel}
</div>
</div>

<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

{/* Idle */}
{status === 'idle' && (
<div className="rounded-2xl p-10 flex flex-col items-center text-center" style={cardStyle}>
<div className="relative w-24 h-24 mb-6 portrait-ring">
<svg className="w-24 h-24 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" style={{ stroke: 'rgb(var(--muted) / 0.2)' }} strokeWidth="1" />
<circle cx="54" cy="54" r="44" style={{ fill: 'rgb(var(--surface))', stroke: 'rgb(var(--gold) / 0.45)' }} strokeWidth="1" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<ImageIcon className="w-7 h-7 text-[rgb(var(--gold))]" />
</div>
</div>
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">{t("Measure your face")}</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-2 max-w-xs">
{t("We map 478 facial landmarks and measure real ratios: symmetry, thirds, canthal tilt, eye spacing, jaw width.")}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mb-8 max-w-xs">
{t("Front-facing, neutral expression, hair off the face, even lighting. Runs on your device. Your photo is not uploaded.")}
</p>

{canScan ? (
<div className="flex gap-3">
<button onClick={startCamera} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
<Camera className="w-4 h-4" /> {t("Use Camera")}
</button>
<button onClick={openFilePicker} className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={ghostBtn}>
<Upload className="w-4 h-4" /> {t("Upload")}
</button>
</div>
) : (
<div className="space-y-4">
<div className="flex items-center gap-2 text-[rgb(var(--muted))] text-sm justify-center">
<Lock className="w-4 h-4" /> Your free scan is used. Next one in {hoursUntilNext}h
</div>
<button onClick={onGoPremium} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide mx-auto" style={primaryBtn}>
<Crown className="w-4 h-4" /> {t("Unlock unlimited readings")}
</button>
</div>
)}
</div>
)}

{/* Capture: 3 steps (front, eye close-up, nose close-up) */}
{status === 'capture' && (
<div className="rounded-2xl p-6 flex flex-col items-center" style={cardStyle}>
<div className="w-full flex items-center justify-between mb-1">
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">
{t('Step {n} of 3', { n: STEP_COPY[step].n })}
</span>
<div className="flex gap-1.5">
{(['front', 'eye', 'nose'] as Step[]).map(st => (
<span
key={st}
className="h-1.5 w-6 rounded-full"
style={{
background:
STEP_COPY[st].n <= STEP_COPY[step].n ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.25)',
}}
/>
))}
</div>
</div>
<h3 className="w-full font-display text-lg text-[rgb(var(--gold))] font-semibold">{t(STEP_COPY[step].title)}</h3>
<p className="w-full text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-5">{t(STEP_COPY[step].how)}</p>

<div
className={`relative w-64 h-64 overflow-hidden mb-6 ${step === 'front' ? 'rounded-full portrait-ring' : 'rounded-2xl'}`}
style={{ background: 'rgb(var(--bg))', border: '2px solid rgb(var(--gold) / 0.4)' }}
>
{cameraActive && !imagePreview && (
<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
)}
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Captured preview" className="w-full h-full object-cover" />
)}
{!cameraActive && !imagePreview && (
<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
<button onClick={startCamera} className="flex items-center gap-2 font-medium py-2.5 px-5 rounded-xl text-xs" style={primaryBtn}>
<Camera className="w-4 h-4" /> {t("Use camera")}
</button>
<button
onClick={openFilePicker}
className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-2.5 px-5 rounded-xl text-xs"
style={ghostBtn}
>
<Upload className="w-4 h-4" /> {t("Upload photo")}
</button>
</div>
)}

{/* Guide boxes for close-ups */}
{step === 'eye' && (
<>
<div className="absolute pointer-events-none rounded-lg" style={{ left: '15%', top: '22%', width: '70%', height: '30%', border: '1.5px dashed rgb(var(--gold) / 0.8)' }}>
<span className="absolute -top-5 left-0 text-[10px] text-[rgb(var(--gold))]">{t("eye")}</span>
</div>
<div className="absolute pointer-events-none rounded-lg" style={{ left: '20%', top: '55%', width: '60%', height: '22%', border: '1.5px dashed rgb(var(--gold) / 0.5)' }}>
<span className="absolute -bottom-5 left-0 text-[10px] text-[rgb(var(--gold))]">{t("under-eye")}</span>
</div>
</>
)}
{step === 'nose' && (
<div className="absolute pointer-events-none rounded-xl" style={{ left: '28%', top: '28%', width: '44%', height: '44%', border: '1.5px dashed rgb(var(--gold) / 0.8)' }}>
<span className="absolute -top-5 left-0 text-[10px] text-[rgb(var(--gold))]">{t("nose")}</span>
</div>
)}

<button
onClick={cancelCapture}
aria-label="Cancel"
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[rgb(var(--gold))]"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button onClick={capturePhoto} className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
{t("Capture")}
</button>
)}

{imagePreview && (
<div className="flex gap-3">
<button
onClick={retake}
className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-5 rounded-xl text-[13px] tracking-wide"
style={ghostBtn}
>
<RefreshCw className="w-4 h-4" /> {t("Retake")}
</button>
<button onClick={nextStep} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
{step === 'nose' ? (
<>
<Sparkles className="w-4 h-4" /> {t("Analyze")}
</>
) : (
<>{step === 'front' ? t('Next: eye close-up') : t('Next: nose close-up')}</>
)}
</button>
</div>
)}

{(step === 'front' && imagePreview) || step === 'eye' || (step === 'nose' && !imagePreview) ? (
<button onClick={analyzeNow} className="mt-4 text-[11px] text-[rgb(var(--muted))] underline underline-offset-4">
{t("Skip close-ups and analyze now")}
</button>
) : null}
</div>
)}

{/* Scanning */}
{status === 'scanning' && (
<div className="rounded-2xl p-6 flex flex-col items-center" style={cardStyle}>
<div
className="relative w-64 h-64 rounded-full overflow-hidden mb-6"
style={{ background: 'rgb(var(--bg))', border: '2px solid rgb(var(--gold) / 0.4)' }}
>
{(shots.front ?? imagePreview) && (
// eslint-disable-next-line @next/next/no-img-element
<img src={shots.front ?? imagePreview ?? ''} alt="Scanning" className="w-full h-full object-cover opacity-70" />
)}
<div className="absolute inset-0 scan-grid" />
<div className="scan-line" />
</div>
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">{t("Mapping landmarks")}</h3>
<p className="text-sm text-[rgb(var(--muted))]">{t("First run downloads the face model (~4 MB)")}</p>
</div>
)}

{/* Error */}
{status === 'error' && (
<div className="rounded-2xl p-8 flex flex-col items-center text-center" style={cardStyle}>
<AlertTriangle className="w-8 h-8 mb-4" style={{ color: 'rgb(var(--err))' }} />
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">{t("Could not read your face")}</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6 max-w-xs">{t(errorMsg)}</p>
<button onClick={resetScan} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
<RefreshCw className="w-4 h-4" /> {t("Try again")}
</button>
</div>
)}

{/* Result */}
{status === 'result' && result && (
<div className="space-y-6">
{/* Photo with landmark overlay */}
<div className="flex flex-col items-center p-6 rounded-2xl" style={cardStyle}>
<div
className="relative w-full max-w-xs rounded-2xl overflow-hidden"
style={{ border: '1px solid rgb(var(--gold) / 0.35)' }}
>
{(result.croppedImage || imagePreview) && (
// eslint-disable-next-line @next/next/no-img-element
<img src={result.croppedImage || imagePreview || ''} alt="Scanned" className="block w-full h-auto" />
)}
{result.overlay.map((pt, i) => (
<span
key={i}
className="absolute rounded-full"
style={{
left: `${pt.x * 100}%`,
top: `${pt.y * 100}%`,
width: 5,
height: 5,
marginLeft: -2.5,
marginTop: -2.5,
background: 'rgb(var(--gold))',
boxShadow: '0 0 6px rgb(var(--gold))',
}}
/>
))}
</div>
{(() => {
const tier = faceTier(result.overall, gender);
const ladder = faceTiers(gender);
const idx = ladder.findIndex(x => x.key === tier.key);
return (
<div className="w-full mt-5">
<div className="text-center mb-4">
<span className="text-[10px] tracking-[0.25em] text-[rgb(var(--muted))] uppercase block mb-1">{t('Your tier')}</span>
<span
className="font-display text-3xl font-bold text-[rgb(var(--gold))]"
style={{ textShadow: '0 0 18px rgb(var(--gold) / 0.45)' }}
>
{tier.label}
</span>
{tier.full !== tier.label && (
<span className="block text-[11px] text-[rgb(var(--muted-hover))] mt-0.5">{t(tier.full)}</span>
)}
</div>
{/* tier ladder: where you stand */}
<div className="flex gap-1">
{ladder.map((x, i) => (
<div key={x.key} className="flex-1 min-w-0">
<div
className="h-1.5 rounded-full"
style={{
background:
i < idx ? 'rgb(var(--gold) / 0.45)' : i === idx ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.2)',
boxShadow: i === idx ? '0 0 8px rgb(var(--gold))' : 'none',
}}
/>
<span
className="block text-[8px] text-center mt-1 truncate"
style={{ color: i === idx ? 'rgb(var(--gold))' : 'rgb(var(--muted))', fontWeight: i === idx ? 700 : 400 }}
>
{x.label}
</span>
</div>
))}
</div>
{idx < ladder.length - 1 && (
<p className="text-[11px] text-[rgb(var(--muted))] text-center mt-3">
{t('{n} points to {tier}', { n: (ladder[idx + 1].min - result.overall).toFixed(1), tier: ladder[idx + 1].label })}
</p>
)}
</div>
);
})()}
<p className="text-xs text-[rgb(var(--muted-hover))] text-center mt-3 max-w-xs leading-relaxed">
{t(verdict(result.overall))}
</p>
</div>

{/* Progress feedback: compares with your earlier scans (Premium only) */}
{showFull && feedback && (
<div
className="rounded-2xl p-5"
style={
feedback.trend === 'declining'
? { ...cardStyle, border: '1px solid rgb(var(--err) / 0.35)' }
: feedback.trend === 'improving'
? accentCardStyle
: cardStyle
}
>
<div className="flex items-center justify-between mb-2">
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">
Scan #{feedback.scanNumber}
</span>
{feedback.baseline !== null && (
<span
className="font-display text-sm font-semibold"
style={{
color:
feedback.trend === 'declining'
? 'rgb(var(--err))'
: feedback.trend === 'improving'
? 'rgb(var(--gold))'
: 'rgb(var(--muted-hover))',
}}
>
{feedback.delta > 0 ? '+' : ''}
{feedback.delta.toFixed(1)} vs your average {feedback.baseline.toFixed(1)}
</span>
)}
</div>
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-1.5">{t(feedback.headline)}</h3>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-3">{t(feedback.message)}</p>

{(feedback.wins.length > 0 || feedback.watch.length > 0) && (
<div className="flex flex-wrap gap-2 mb-3">
{feedback.wins.map(w => (
<span key={w} className="text-[11px] rounded-full px-3 py-1" style={{ background: 'rgb(var(--gold) / 0.12)', color: 'rgb(var(--gold))' }}>
▲ {tTag(w)}
</span>
))}
{feedback.watch.map(w => (
<span key={w} className="text-[11px] rounded-full px-3 py-1" style={{ background: 'rgb(var(--err) / 0.12)', color: 'rgb(var(--err))' }}>
▼ {tTag(w)}
</span>
))}
</div>
)}

{feedback.tips.length > 0 && (
<div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{t("Focus next")}</span>
<ul className="space-y-1.5">
{feedback.tips.map(tip => (
<li key={tip} className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed flex gap-2">
<span className="text-[rgb(var(--gold))]">•</span>
<span>{t(tip)}</span>
</li>
))}
</ul>
</div>
)}
</div>
)}

{/* Overall vs Potential (Potential is Premium) */}
<div className={`grid gap-4 ${showFull ? 'grid-cols-2' : 'grid-cols-1'}`}>
<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<Gauge className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Overall")}</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.overall.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.overall * 10}%`, background: scoreColor(result.overall) }} />
</div>
</div>
{showFull && (
<div className="rounded-2xl p-5" style={accentCardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{t("Potential (est.)")}</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.potential.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.potential * 10}%`, background: scoreColor(result.potential) }} />
</div>
</div>
)}
</div>

{/* Free users: a real taste of each Premium feature, the rest blurred */}
{!showFull && (() => {
const groupKeys = Object.keys(GROUP_LABELS) as GroupKey[];
const weakestGroup = [...groupKeys].sort((a, b) => result.groups[a] - result.groups[b])[0];
const plan = buildPlan(result.measurements);
const topFocus = plan.focus[0];
const moreWeak = Math.max(0, result.levers.length - 1);
const blur: React.CSSProperties = { filter: 'blur(6px)', userSelect: 'none' };
const lockRow = (text: string) => (
<div
className="mt-4 pt-3 flex items-center gap-2 text-[11px] text-[rgb(var(--gold))]"
style={{ borderTop: '1px solid rgb(var(--muted) / 0.15)' }}
>
<Lock className="w-3 h-3" /> {text}
</div>
);
return (
<>
{/* Potential: hidden */}
<button onClick={onGoPremium} className="w-full text-left rounded-2xl p-5" style={accentCardStyle}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-1.5">
<TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{t("Your potential")}</span>
</div>
<Lock className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
</div>
<div className="flex items-baseline gap-3 mt-2">
<span className="font-display text-3xl font-bold text-[rgb(var(--gold))]" style={blur} aria-hidden>
8.8
</span>
<span className="text-xs text-[rgb(var(--muted-hover))]">{t("See how high you can realistically go.")}</span>
</div>
</button>

{/* Progress: show the verdict, hide the details */}
{feedback && feedback.trend !== 'first' && (
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-1.5">
{t("Since your last scans")}
</span>
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{t(feedback.headline)}</h3>
<p className="text-xs text-[rgb(var(--muted-hover))] mt-1" style={blur} aria-hidden>
{t("+0.4 vs your average \u00b7 Jaw up 0.6 \u00b7 Focus on sleep and leanness next")}
</p>
{lockRow(t('See exactly what changed and what to do next'))}
</div>
)}

{/* Breakdown: weakest area visible, the rest blurred */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-4">{t("Breakdown")}</span>
<div className="grid grid-cols-2 gap-4">
{groupKeys.map(k => {
const open = k === weakestGroup;
return (
<div key={k}>
<div className="flex items-center justify-between mb-2.5">
<span className="text-xs text-[rgb(var(--muted-hover))]">
{t(GROUP_LABELS[k])}
{open && <span className="text-[rgb(var(--err))]"> {t("\u00b7 weakest")}</span>}
</span>
<span
className="font-display text-sm font-semibold text-[rgb(var(--gold))]"
style={open ? undefined : blur}
aria-hidden={!open}
>
{open ? result.groups[k].toFixed(1) : '7.7'}
</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden">
<div
className="h-full rounded-full score-bar-fill"
style={{
width: open ? `${result.groups[k] * 10}%` : '70%',
background: open ? scoreColor(result.groups[k]) : 'rgb(var(--muted) / 0.4)',
}}
/>
</div>
</div>
);
})}
</div>
{lockRow(t('Unlock your full breakdown'))}
</div>

{/* Skin: one finding visible, the rest locked */}
{skin && skin.items.length > 0 && (
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2">
<Sparkles className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Skin reading \u00b7 beta")}</span>
</div>
<span className="font-display text-lg font-semibold text-[rgb(var(--gold))]" style={blur} aria-hidden>
7.2
</span>
</div>
<p className="text-sm text-[rgb(var(--gold))] font-medium">{t(skin.items[0].label)}</p>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mt-0.5">{t(skin.items[0].verdict)}</p>
{skin.items.length > 1
? lockRow(t('{n} more skin results and what to do about them', { n: skin.items.length - 1 }))
: lockRow(t('See what to do about it'))}
</div>
)}

{/* One real weak point */}
{result.levers.length > 0 && (
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-3">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Your #1 weak point")}</span>
</div>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">{t(result.levers[0])}</p>
{moreWeak > 0 && lockRow(t('{n} more weak points found', { n: moreWeak }))}
</div>
)}

{/* Plan: show where it starts, hide the steps */}
{topFocus && (
<div className="p-6 rounded-2xl" style={accentCardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-2">{t("Your plan is ready")}</span>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-3">
{t('It starts with')} <span className="text-[rgb(var(--gold))] font-medium">{t(topFocus.label)}</span>
{topFocus.levers[0] ? <> : {t(topFocus.levers[0].title)}</> : null}
</p>
<ul className="space-y-1.5" style={blur} aria-hidden>
<li className="text-xs text-[rgb(var(--muted-hover))]">{t("\u2022 Step one of your personal routine for this area")}</li>
<li className="text-xs text-[rgb(var(--muted-hover))]">{t("\u2022 Step two with how often to do it")}</li>
<li className="text-xs text-[rgb(var(--muted-hover))]">{t("\u2022 What to avoid so it actually works")}</li>
</ul>
{lockRow(t('Plus {n} raw measurements and unlimited scans', { n: result.measurements.length }))}
</div>
)}

<button
onClick={onGoPremium}
className="w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-xl text-[13px]"
style={primaryBtn}
>
<Crown className="w-4 h-4" /> {t("Unlock my full report")}
</button>
</>
);
})()}

{showFull && (
<>

{/* Groups */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-4">{t("Breakdown")}</span>
<div className="grid grid-cols-2 gap-4">
{(Object.keys(GROUP_LABELS) as GroupKey[]).map(k => (
<div key={k}>
<div className="flex items-center justify-between mb-2.5">
<span className="text-xs text-[rgb(var(--muted-hover))]">{t(GROUP_LABELS[k])}</span>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))]">{result.groups[k].toFixed(1)}</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.groups[k] * 10}%`, background: scoreColor(result.groups[k]) }} />
</div>
</div>
))}
</div>
</div>

{/* Skin reading (Premium) */}
{skin && (
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center justify-between mb-1">
<div className="flex items-center gap-2">
<Sparkles className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Skin reading \u00b7 beta")}</span>
</div>
<span className="font-display text-lg font-semibold text-[rgb(var(--gold))]">
{skin.items.length ? skin.score.toFixed(1) : '–'}
<span className="text-xs font-normal text-[rgb(var(--muted))] font-body">/10</span>
</span>
</div>
<p className="text-[11px] text-[rgb(var(--muted))] mb-4">
{t("Rough reading. Light and camera change it a lot, so scan in the same light each time. Not part of your face score.")}
</p>
<div className="space-y-5">
{(['front', 'eye', 'nose'] as Step[]).map(src => {
if (!skin.given[src]) {
return src === 'front' ? null : (
<p key={src} className="text-[11px] text-[rgb(var(--muted))]">
{src === 'eye'
? t('Eye close-up skipped. Add it next scan for under-eye results.')
: t('Nose close-up skipped. Add it next scan for pore and oil results.')}
</p>
);
}
const list = skin.items.filter(it => it.source === src);
return (
<div key={src}>
<div className="flex items-center gap-3 mb-3">
{shots[src] && (
// eslint-disable-next-line @next/next/no-img-element
<img src={shots[src]} alt="" className="w-10 h-10 rounded-lg object-cover" />
)}
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">
{t(src === 'front' ? 'Front photo' : src === 'eye' ? 'Eye close-up' : 'Nose close-up')}
</span>
</div>
{list.length === 0 ? (
<p className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--err))' }}>
{t('Could not read this photo. Retake it closer, in good light, inside the box.')}
</p>
) : (
<div className="space-y-4">
{list.map(it => (
<div key={it.key}>
<div className="flex items-center justify-between text-xs mb-1.5">
<span className="text-[rgb(var(--muted-hover))]">{t(it.label)}</span>
<span className="font-display text-[rgb(var(--gold))]">{it.score.toFixed(1)}</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden mb-1.5">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${it.score * 10}%`, background: scoreColor(it.score) }} />
</div>
<p className="text-[11px] text-[rgb(var(--muted-hover))] leading-relaxed">{t(it.verdict)}</p>
{it.score < 7.5 && (
<p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed mt-1">→ {t(it.tip)}</p>
)}
</div>
))}
</div>
)}
</div>
);
})}
</div>
</div>
)}

{/* Weak points */}
{result.levers.length > 0 && (
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Weakest measurements")}</span>
</div>
<div className="space-y-3">
{(showFull ? result.levers : result.levers.slice(0, 1)).map((l, i) => (
<p key={i} className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">{t(l)}</p>
))}
</div>
{!showFull && result.levers.length > 1 && (
<div
className="mt-4 pt-4 flex items-center gap-2 text-xs text-[rgb(var(--gold))]"
style={{ borderTop: '1px solid rgb(var(--muted) / 0.15)', opacity: 0.8 }}
>
<Lock className="w-3 h-3" /> {t('Premium shows all weak points')}
</div>
)}
</div>
)}

{/* Personal improvement plan */}
<div>
<div className="flex items-center gap-2 mb-3 px-1">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Your improvement plan")}</span>
</div>
{showFull ? (
<PlanView measurements={result.measurements} />
) : (
<div className="rounded-2xl p-6 text-center" style={accentCardStyle}>
<Lock className="w-6 h-6 mx-auto mb-3 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))] mb-1">
{t("Premium turns this scan into a plan for your weakest areas.")}
</p>
<p className="text-xs text-[rgb(var(--muted))] mb-4">
{t("Weak jaw? You get jaw, posture and leanness work. Weak symmetry? You get habits and styling for it.")}
</p>
<button onClick={onGoPremium} className="inline-flex items-center gap-2 font-medium py-2.5 px-5 rounded-xl text-xs" style={primaryBtn}>
<Crown className="w-3.5 h-3.5" /> {t("Unlock my plan")}
</button>
</div>
)}
</div>

{/* Measurement table */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Ruler className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Raw measurements")}</span>
</div>
{showFull ? (
<div className="space-y-3">
{result.measurements.map(m => (
<div key={m.key}>
<div className="flex items-center justify-between text-xs mb-1.5">
<span className="text-[rgb(var(--muted-hover))]">{t(m.label)}</span>
<span className="font-display text-[rgb(var(--gold))]">
{formatValue(m)}
<span className="text-[rgb(var(--muted))] font-body"> · {t('ideal')} {formatIdeal(m)}</span>
</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${m.score * 10}%`, background: scoreColor(m.score) }} />
</div>
</div>
))}
</div>
) : (
<div className="text-center py-4">
<Lock className="w-5 h-5 mx-auto mb-2 text-[rgb(var(--muted))]" />
<p className="text-xs text-[rgb(var(--muted))] mb-4">
{t('See all {n} measurements against their ideal values.', { n: result.measurements.length })}
</p>
<button onClick={onGoPremium} className="font-medium py-2 px-5 rounded-xl text-xs" style={primaryBtn}>
{t("Unlock full table")}
</button>
</div>
)}
</div>

</>
)}

{/* Honest footnote */}
<div className="px-2 text-[11px] leading-relaxed text-[rgb(var(--muted))]">
{t('This scores facial structure only, from landmark ratios. It does not measure hair, grooming, expression, body fat or style, which affect how people actually perceive you. Ratios are a weak predictor of attractiveness. Treat this as one data point. Potential is an estimate of grooming and leanness upside.')}
</div>

<div className="flex items-center gap-5">
<button onClick={resetScan} className="flex items-center gap-2 text-[rgb(var(--muted-hover))] text-xs font-medium">
<RefreshCw className="w-3 h-3" /> {t("Rescan")}
</button>
<button onClick={shareResult} className="flex items-center gap-2 text-[rgb(var(--muted))] text-xs font-medium">
<Share2 className="w-3 h-3" /> {t("Share")}
</button>
</div>
</div>
)}
</div>
);
}

