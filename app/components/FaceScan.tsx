'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlanView } from './FullPlan';
import {
analyzeFace,
preloadFaceModel,
FaceAnalysisError,
GROUP_LABELS,
formatValue,
formatIdeal,
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

const todayKey = () => `potentia-scans-${new Date().toISOString().slice(0, 10)}`;

export default function FaceScan({ isPremium, onGoPremium }: FaceScanProps) {
const [gender, setGender] = useState<'male' | 'female'>('male');
const [scansUsedToday, setScansUsedToday] = useState(0);
const [status, setStatus] = useState<'idle' | 'capture' | 'scanning' | 'result' | 'error'>('idle');
const [result, setResult] = useState<FaceAnalysis | null>(null);
const [errorMsg, setErrorMsg] = useState('');
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [cameraActive, setCameraActive] = useState(false);

const fileInputRef = useRef<HTMLInputElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);

useEffect(() => {
preloadFaceModel();
try {
setScansUsedToday(parseInt(localStorage.getItem(todayKey()) || '0', 10) || 0);
} catch {}
const fetchGender = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
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

const freeLimit = 1;
const canScan = isPremium || scansUsedToday < freeLimit;
const scansLeft = isPremium ? '∞' : Math.max(freeLimit - scansUsedToday, 0);

const openFilePicker = () => {
if (!canScan) return;
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
try {
const stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
});
streamRef.current = stream;
setCameraActive(true);
setStatus('capture');
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
setStatus('idle');
};

const runScan = async () => {
if (!imagePreview) return;
setStatus('scanning');
const started = Date.now();
try {
const analysis = await analyzeFace(imagePreview, gender);
const wait = Math.max(0, 1600 - (Date.now() - started));
await new Promise(r => setTimeout(r, wait));
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
if (!isPremium) {
const next = scansUsedToday + 1;
setScansUsedToday(next);
try {
localStorage.setItem(todayKey(), String(next));
} catch {}
}
} catch (e) {
const code = e instanceof FaceAnalysisError ? e.code : 'IMAGE_FAILED';
setErrorMsg(ERROR_COPY[code] || 'Something went wrong. Try again.');
setStatus('error');
}
};

const resetScan = () => {
setStatus('idle');
setResult(null);
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
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">Reading</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">Facial Structure Scan</h2>
</div>
<div
className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-wide"
style={{
background: isPremium ? 'rgb(var(--gold) / 0.12)' : 'rgb(var(--muted) / 0.1)',
color: isPremium ? 'rgb(var(--gold))' : 'rgb(var(--muted))',
}}
>
{isPremium && <Crown className="w-3 h-3" />}
{isPremium ? 'Unlimited' : `${scansLeft} scan left today`}
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
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">Measure your face</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-2 max-w-xs">
We map 478 facial landmarks and measure real ratios: symmetry, thirds, canthal tilt, eye spacing, jaw width.
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mb-8 max-w-xs">
Front-facing, neutral expression, hair off the face, even lighting. Runs on your device. Your photo is not uploaded.
</p>

{canScan ? (
<div className="flex gap-3">
<button onClick={startCamera} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
<Camera className="w-4 h-4" /> Use Camera
</button>
<button onClick={openFilePicker} className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={ghostBtn}>
<Upload className="w-4 h-4" /> Upload
</button>
</div>
) : (
<div className="space-y-4">
<div className="flex items-center gap-2 text-[rgb(var(--muted))] text-sm justify-center">
<Lock className="w-4 h-4" /> Today&apos;s free reading is spent
</div>
<button onClick={onGoPremium} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide mx-auto" style={primaryBtn}>
<Crown className="w-4 h-4" /> Unlock unlimited readings
</button>
</div>
)}
</div>
)}

{/* Capture */}
{status === 'capture' && (
<div className="rounded-2xl p-6 flex flex-col items-center" style={cardStyle}>
<div
className="relative w-64 h-64 rounded-full overflow-hidden mb-6 portrait-ring"
style={{ background: 'rgb(var(--bg))', border: '2px solid rgb(var(--gold) / 0.4)' }}
>
{cameraActive && !imagePreview && (
<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
)}
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Captured preview" className="w-full h-full object-cover" />
)}
<button
onClick={cancelCapture}
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[rgb(var(--gold))]"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button onClick={capturePhoto} className="font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
Capture
</button>
)}

{imagePreview && (
<div className="flex gap-3">
<button
onClick={() => { setImagePreview(null); startCamera(); }}
className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide"
style={ghostBtn}
>
<RefreshCw className="w-4 h-4" /> Retake
</button>
<button onClick={runScan} className="flex items-center gap-2 font-medium py-3 px-8 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
<Sparkles className="w-4 h-4" /> Analyze
</button>
</div>
)}
</div>
)}

{/* Scanning */}
{status === 'scanning' && (
<div className="rounded-2xl p-6 flex flex-col items-center" style={cardStyle}>
<div
className="relative w-64 h-64 rounded-full overflow-hidden mb-6"
style={{ background: 'rgb(var(--bg))', border: '2px solid rgb(var(--gold) / 0.4)' }}
>
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Scanning" className="w-full h-full object-cover opacity-70" />
)}
<div className="absolute inset-0 scan-grid" />
<div className="scan-line" />
</div>
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">Mapping landmarks</h3>
<p className="text-sm text-[rgb(var(--muted))]">First run downloads the face model (~4 MB)</p>
</div>
)}

{/* Error */}
{status === 'error' && (
<div className="rounded-2xl p-8 flex flex-col items-center text-center" style={cardStyle}>
<AlertTriangle className="w-8 h-8 mb-4" style={{ color: 'rgb(var(--err))' }} />
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">Could not read your face</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-6 max-w-xs">{errorMsg}</p>
<button onClick={resetScan} className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl text-[13px] tracking-wide" style={primaryBtn}>
<RefreshCw className="w-4 h-4" /> Try again
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
<div className="rounded-full px-4 py-1 mt-4" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
<span className="text-[11px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{result.tier}</span>
</div>
<p className="text-xs text-[rgb(var(--muted-hover))] text-center mt-3 max-w-xs leading-relaxed">
{verdict(result.overall)}
</p>
</div>

{/* Overall vs Potential */}
<div className="grid grid-cols-2 gap-4">
<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<Gauge className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Overall</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.overall.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.overall * 10}%`, background: scoreColor(result.overall) }} />
</div>
</div>
<div className="rounded-2xl p-5" style={accentCardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">Potential (est.)</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.potential.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.potential * 10}%`, background: scoreColor(result.potential) }} />
</div>
</div>
</div>

{/* Groups */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-4">Breakdown</span>
<div className="grid grid-cols-2 gap-4">
{(Object.keys(GROUP_LABELS) as GroupKey[]).map(k => (
<div key={k}>
<div className="flex items-center justify-between mb-2.5">
<span className="text-xs text-[rgb(var(--muted-hover))]">{GROUP_LABELS[k]}</span>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))]">{result.groups[k].toFixed(1)}</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden">
<div className="h-full rounded-full score-bar-fill" style={{ width: `${result.groups[k] * 10}%`, background: scoreColor(result.groups[k]) }} />
</div>
</div>
))}
</div>
</div>

{/* Weak points */}
{result.levers.length > 0 && (
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Weakest measurements</span>
</div>
<div className="space-y-3">
{(showFull ? result.levers : result.levers.slice(0, 1)).map((l, i) => (
<p key={i} className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">{l}</p>
))}
</div>
{!showFull && result.levers.length > 1 && (
<div
className="mt-4 pt-4 flex items-center gap-2 text-xs text-[rgb(var(--gold))]"
style={{ borderTop: '1px solid rgb(var(--muted) / 0.15)', opacity: 0.8 }}
>
<Lock className="w-3 h-3" /> Premium shows all weak points
</div>
)}
</div>
)}

{/* Personal improvement plan */}
<div>
<div className="flex items-center gap-2 mb-3 px-1">
<Target className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Your improvement plan</span>
</div>
{showFull ? (
<PlanView measurements={result.measurements} />
) : (
<div className="rounded-2xl p-6 text-center" style={accentCardStyle}>
<Lock className="w-6 h-6 mx-auto mb-3 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))] mb-1">
Premium turns this scan into a plan for your weakest areas.
</p>
<p className="text-xs text-[rgb(var(--muted))] mb-4">
Weak jaw? You get jaw, posture and leanness work. Weak symmetry? You get habits and styling for it.
</p>
<button onClick={onGoPremium} className="inline-flex items-center gap-2 font-medium py-2.5 px-5 rounded-xl text-xs" style={primaryBtn}>
<Crown className="w-3.5 h-3.5" /> Unlock my plan
</button>
</div>
)}
</div>

{/* Measurement table */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Ruler className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Raw measurements</span>
</div>
{showFull ? (
<div className="space-y-3">
{result.measurements.map(m => (
<div key={m.key}>
<div className="flex items-center justify-between text-xs mb-1.5">
<span className="text-[rgb(var(--muted-hover))]">{m.label}</span>
<span className="font-display text-[rgb(var(--gold))]">
{formatValue(m)}
<span className="text-[rgb(var(--muted))] font-body"> · ideal {formatIdeal(m)}</span>
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
See all {result.measurements.length} measurements against their ideal values.
</p>
<button onClick={onGoPremium} className="font-medium py-2 px-5 rounded-xl text-xs" style={primaryBtn}>
Unlock full table
</button>
</div>
)}
</div>

{/* Honest footnote */}
<div className="px-2 text-[11px] leading-relaxed text-[rgb(var(--muted))]">
This scores facial <em>structure</em> only, from landmark ratios. It does not measure skin, hair, grooming,
expression, body fat or style, which affect how people actually perceive you. Ratios are a weak predictor of
attractiveness. Treat this as one data point. Potential is an estimate of grooming and leanness upside.
</div>

<div className="flex items-center gap-5">
<button onClick={resetScan} className="flex items-center gap-2 text-[rgb(var(--muted-hover))] text-xs font-medium">
<RefreshCw className="w-3 h-3" /> Rescan
</button>
<button onClick={shareResult} className="flex items-center gap-2 text-[rgb(var(--muted))] text-xs font-medium">
<Share2 className="w-3 h-3" /> Share
</button>
</div>
</div>
)}
</div>
);
}

