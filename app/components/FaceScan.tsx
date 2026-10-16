'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
Camera,
Upload,
Sparkles,
Lock,
Dumbbell,
Crown,
RefreshCw,
CheckCircle2,
X,
ImageIcon,
TrendingUp,
Share2,
Gauge,
} from 'lucide-react';

type Metric = { label: string; score: number };

type ScanResult = {
overallScore: number;
potentialScore: number;
metrics: Metric[];
skinNotes: string;
bodyNotes: string;
trainingFocus: string[];
premiumInsight?: string;
};

const MALE_COPY = {
skinNotesByBand: {
low: [
'Visible dehydration and uneven tone across the cheeks and T-zone. Texture is rough in several spots — this is the first thing people register before anything else.',
'Noticeable oil buildup and clogged pores along the jawline and nose. Barrier function is compromised — a real routine, not just soap, is needed.',
'Dull, uneven complexion with visible sun damage markers. Skin is currently working against your overall look more than it needs to.',
],
mid: [
'Mild dehydration around the T-zone. Tone is mostly even but texture is inconsistent — a lightweight daily moisturizer and consistent SPF would move this up.',
'Some oil buildup around the jawline, common with regular shaving. Nothing alarming, but there is a clear ceiling until this is addressed.',
'Skin is holding up but showing early sun exposure markers on the forehead. Average for now — easy to improve with consistency.',
],
high: [
'Clear, even tone with good hydration. Minor sun exposure markers are the only thing holding this back from a top score.',
'Skin recovery looks strong and texture is consistent. This is genuinely above average — maintain, do not change.',
],
},
bodyNotesByBand: {
low: [
'Posture is noticeably forward-leaning with rounded shoulders — this is costing you more visually than people realize. Little visible muscle definition.',
'Significant imbalance between upper and lower body development. Core engagement is weak and it shows in overall silhouette.',
'Low muscle tone throughout. This is the single biggest lever you have to move your score — more than any skincare change will.',
],
mid: [
'Posture is slightly forward-leaning, likely from desk time. Shoulder width and symmetry are average — there is real room to build here.',
'Upper body development is ahead of lower body — legs are the clear weak point holding the overall physique score down.',
'Average symmetry. Core engagement looks noticeably weak in the lower abdomen — this is fixable fast with consistent training.',
],
high: [
'Good overall symmetry and posture. Core engagement is solid — this is genuinely carrying your score.',
'Strong upper and lower body balance. Minor room to tighten the midsection further but this is well above average.',
],
},
training: [
['Posterior chain (deadlifts, rows)', 'Core stability — anti-rotation work', 'Mobility: thoracic spine'],
['Leg day priority — squats, lunges', 'Upper body maintenance volume', 'Hip mobility work'],
['Full-body compound lifts', 'Progressive overload on bench and squat', 'Weekly mobility session'],
],
metricLabels: ['Jawline', 'Skin Clarity', 'Symmetry', 'Physique'],
};

const FEMALE_COPY = {
skinNotesByBand: {
low: [
'Visible dehydration and uneven tone, particularly around the cheeks and nose. Texture is rough in places — this is dragging the score down more than any single feature.',
'Noticeable redness and uneven pigmentation. Barrier function looks compromised — this needs an actual routine, not just a quick fix.',
'Dull complexion with visible dehydration lines. This is currently the weakest part of the overall reading.',
],
mid: [
'Mild dehydration around the cheeks. Tone is mostly even — a richer night cream and consistent SPF would move this up a real amount.',
'Slight redness near the nose with uneven texture in places. Not bad, but there is a clear ceiling until this is addressed consistently.',
'Skin is average — hydrated in some areas, dry in others. Minor sun exposure markers detected.',
],
high: [
'Even tone and good hydration throughout. Minor sun exposure markers are the only thing holding this back from a top score.',
'Skin looks genuinely well cared for — texture and tone are consistent. Maintain this, do not change it.',
],
},
bodyNotesByBand: {
low: [
'Posture is noticeably forward-leaning. Muscle tone is low throughout and it is visibly affecting overall silhouette more than people realize.',
'Significant imbalance between upper and lower body. Core engagement is weak — this is the biggest lever available to you.',
'Low definition throughout. Training consistency, not skincare, is what will move this score the most.',
],
mid: [
'Posture is slightly forward-leaning. Shoulder and hip alignment are average — real room to build definition here.',
'Average muscle tone throughout. Core engagement could be noticeably stronger — this is fixable fast.',
'Average symmetry. Lower body strength is slightly ahead of upper body, which is currently the weak point.',
],
high: [
'Good muscle tone and posture throughout. Core engagement is solid — this is genuinely carrying your score.',
'Strong overall symmetry. Minor room to build upper body strength further but this is well above average.',
],
},
training: [
['Glute-focused lower body work', 'Core stability — anti-rotation work', 'Mobility: hips and thoracic spine'],
['Upper body strength priority', 'Progressive overload on compound lifts', 'Weekly mobility session'],
['Full-body strength training', 'Core and posture work', 'Light cardio for recovery days'],
],
metricLabels: ['Facial Harmony', 'Skin Clarity', 'Symmetry', 'Physique'],
};

type FaceScanProps = {
isPremium: boolean;
onGoPremium: () => void;
};

// Shared glass-card look, matching the dashboard's Biometric Lab theme
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

function tierLabel(score: number) {
if (score >= 8.6) return 'Elite';
if (score >= 7.2) return 'Refined';
if (score >= 5.8) return 'Ascending';
return 'Foundation';
}

// Box-Muller gaussian sample, clamped to a realistic 1–10 band
function gaussianScore(mean: number, stdDev: number, min = 1.5, max = 9.6) {
let u = 0, v = 0;
while (u === 0) u = Math.random();
while (v === 0) v = Math.random();
const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
const raw = mean + z * stdDev;
return Math.min(max, Math.max(min, Math.round(raw * 10) / 10));
}

function band(score: number): 'low' | 'mid' | 'high' {
if (score < 4.8) return 'low';
if (score < 7) return 'mid';
return 'high';
}

// One accent family, theme-safe: severity is opacity/weight, not a hardcoded hex,
// so it reads correctly in both light and dark Lab themes.
function scoreColor(score: number) {
if (score < 4.8) return 'rgb(var(--muted))';
if (score < 6.5) return 'rgb(var(--gold) / 0.55)';
if (score < 8) return 'rgb(var(--gold) / 0.8)';
return 'rgb(var(--gold))';
}

export default function FaceScan({ isPremium, onGoPremium }: FaceScanProps) {
const [gender, setGender] = useState<'male' | 'female' | null>(null);
const [scansUsedToday, setScansUsedToday] = useState(0);
const [status, setStatus] = useState<'idle' | 'capture' | 'scanning' | 'result'>('idle');
const [result, setResult] = useState<ScanResult | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

const fileInputRef = useRef<HTMLInputElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);
const trainingRef = useRef<HTMLDivElement>(null);
const topRef = useRef<HTMLDivElement>(null);
const [cameraActive, setCameraActive] = useState(false);

useEffect(() => {
const fetchGender = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
const { data: profile } = await supabase
.from('profiles')
.select('gender')
.eq('id', session.user.id)
.single();
if (profile?.gender === 'male' || profile?.gender === 'female') {
setGender(profile.gender);
}
};
fetchGender();
}, []);

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
};

const startCamera = async () => {
if (!canScan) return;
try {
const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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
setImagePreview(canvas.toDataURL('image/jpeg'));
stopCamera();
};

const cancelCapture = () => {
stopCamera();
setImagePreview(null);
setStatus('idle');
};

const runScan = () => {
if (!imagePreview) return;
setStatus('scanning');
setTimeout(() => {
const copy = gender === 'female' ? FEMALE_COPY : MALE_COPY;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Realistic distribution: centered around average, high scores are genuinely rare.
const overallScore = gaussianScore(5.0, 1.15);
// Potential is a modest, earned gap above overall — not a free jump.
const potentialGain = Math.min(1.5, Math.max(0.3, gaussianScore(0.9, 0.5, 0.3, 1.5)));
const potentialScore = Math.min(9.6, Math.round((overallScore + potentialGain) * 10) / 10);

// Sub-metrics are correlated with the overall score (± variance), not independent rolls —
// a low overall can't sit next to a wildly high sub-metric.
const metrics: Metric[] = copy.metricLabels.map(label => ({
label,
score: gaussianScore(overallScore, 0.85, 1.5, 9.5),
}));

const overallBand = band(overallScore);

const mockResult: ScanResult = {
overallScore,
potentialScore,
metrics,
skinNotes: pick(copy.skinNotesByBand[overallBand]),
bodyNotes: pick(copy.bodyNotesByBand[overallBand]),
trainingFocus: isPremium ? pick(copy.training) : [pick(copy.training)[0]],
premiumInsight: isPremium
? overallBand === 'low'
? 'Your biggest ceiling right now is physique, not skin — training consistency will move the overall score faster than any product will.'
: overallBand === 'mid'
? 'Hydration has improved 12% over your last three scans. Add a lightweight SPF for daytime — sun exposure markers ticked up this week.'
: 'You are tracking above the average range. The remaining gap to potential is marginal — consistency matters more than any new change here.'
: undefined,
};
setResult(mockResult);
setStatus('result');
if (!isPremium) setScansUsedToday(prev => prev + 1);
}, 3200);
};

const resetScan = () => {
setStatus('idle');
setResult(null);
setImagePreview(null);
};

const scrollToTraining = () => {
trainingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const scrollToTop = () => {
topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const shareResult = async () => {
if (!result) return;
const text = `Potentia Reading — Overall ${result.overallScore}/10, Potential ${result.potentialScore}/10`;
try {
if (navigator.share) {
await navigator.share({ text, title: 'Potentia' });
} else {
await navigator.clipboard.writeText(text);
alert('Copied your reading to clipboard.');
}
} catch {
/* user cancelled share — ignore */
}
};

return (
<div className="space-y-6 font-body" ref={topRef}>
<style>{`
@keyframes scanLine {
0% { top: 0%; opacity: 0; }
10% { opacity: 1; }
90% { opacity: 1; }
100% { top: 100%; opacity: 0; }
}
@keyframes scanPulse {
0%, 100% { opacity: 0.3; }
50% { opacity: 0.8; }
}
.scan-line {
position: absolute;
left: 0;
right: 0;
height: 2px;
background: linear-gradient(90deg, transparent, rgb(var(--gold)), transparent);
box-shadow: 0 0 12px 2px rgb(var(--gold) / 0.6);
animation: scanLine 2s ease-in-out infinite;
}
.scan-grid {
background-image: linear-gradient(rgb(var(--gold) / 0.08) 1px, transparent 1px),
linear-gradient(90deg, rgb(var(--gold) / 0.08) 1px, transparent 1px);
background-size: 20px 20px;
animation: scanPulse 2s ease-in-out infinite;
}
.portrait-ring {
filter: drop-shadow(0 0 22px rgb(var(--glow) / 0.3));
}
.score-bar-track {
background: rgb(var(--muted) / 0.15);
}
.score-bar-fill {
transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
`}</style>

{/* Header */}
<div className="flex items-center justify-between p-5 rounded-2xl" style={cardStyle}>
<div>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">Reading</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">Face &amp; Body Scan</h2>
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
<div className="rounded-2xl p-12 flex flex-col items-center text-center" style={cardStyle}>
<div className="relative w-24 h-24 mb-6 portrait-ring">
<svg className="w-24 h-24 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" style={{ stroke: 'rgb(var(--muted) / 0.2)' }} strokeWidth="1" />
<circle cx="54" cy="54" r="44" style={{ fill: 'rgb(var(--surface))', stroke: 'rgb(var(--gold) / 0.45)' }} strokeWidth="1" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<ImageIcon className="w-7 h-7 text-[rgb(var(--gold))]" />
</div>
</div>
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">Ready when you are</h3>
<p className="text-sm text-[rgb(var(--muted))] mb-8 max-w-xs">
Position your face and upper body in frame. Good lighting reads best.
</p>

{canScan ? (
<div className="flex gap-3">
<button
onClick={startCamera}
className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl transition-all text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Camera className="w-4 h-4" />
Use Camera
</button>
<button
onClick={openFilePicker}
className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-6 rounded-xl transition-all text-[13px] tracking-wide"
style={{ background: 'rgb(var(--muted) / 0.1)' }}
>
<Upload className="w-4 h-4" />
Upload Photo
</button>
</div>
) : (
<div className="space-y-4">
<div className="flex items-center gap-2 text-[rgb(var(--muted))] text-sm justify-center">
<Lock className="w-4 h-4" />
Today&apos;s free reading is spent
</div>
<button
onClick={onGoPremium}
className="flex items-center gap-2 font-medium py-3 px-6 rounded-xl transition-all text-[13px] tracking-wide mx-auto"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Crown className="w-4 h-4" />
Unlock unlimited readings
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
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[rgb(var(--gold))] hover:bg-black/70 transition-all"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button
onClick={capturePhoto}
className="font-medium py-3 px-8 rounded-xl transition-all text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
Capture
</button>
)}

{imagePreview && (
<div className="flex gap-3">
<button
onClick={() => { setImagePreview(null); startCamera(); }}
className="flex items-center gap-2 text-[rgb(var(--muted-hover))] font-medium py-3 px-6 rounded-xl transition-all text-[13px] tracking-wide"
style={{ background: 'rgb(var(--muted) / 0.1)' }}
>
<RefreshCw className="w-4 h-4" />
Retake
</button>
<button
onClick={runScan}
className="flex items-center gap-2 font-medium py-3 px-8 rounded-xl transition-all text-[13px] tracking-wide"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Sparkles className="w-4 h-4" />
Analyze
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
<div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase bg-black/50 px-2 py-1 rounded-sm whitespace-nowrap">
Analyzing
</div>
</div>
<h3 className="font-display text-lg text-[rgb(var(--gold))] font-semibold mb-2">Reading in progress</h3>
<p className="text-sm text-[rgb(var(--muted))]">Measuring skin and physique markers</p>
</div>
)}

{/* Result — Biometric Lab score layout, theme-aware */}
{status === 'result' && result && (
<div className="space-y-6 pb-24">
{/* Portrait + tier chip */}
<div className="flex flex-col items-center p-6 rounded-2xl" style={cardStyle}>
<div
className="relative w-28 h-28 rounded-full overflow-hidden portrait-ring mb-3"
style={{ border: '2px solid rgb(var(--gold) / 0.6)' }}
>
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Scanned" className="w-full h-full object-cover" />
)}
</div>
<div
className="rounded-full px-4 py-1 -mt-1"
style={{ background: 'rgb(var(--gold) / 0.14)' }}
>
<span className="text-[11px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{tierLabel(result.overallScore)}</span>
</div>
</div>

{/* Overall vs Potential */}
<div className="grid grid-cols-2 gap-4">
<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<Gauge className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Overall</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.overallScore.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div
className="h-full rounded-full score-bar-fill"
style={{ width: `${result.overallScore * 10}%`, background: scoreColor(result.overallScore) }}
/>
</div>
</div>

<div className="rounded-2xl p-5" style={accentCardStyle}>
<div className="flex items-center gap-1.5 mb-3">
<TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">Potential</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))] mb-3">
{result.potentialScore.toFixed(1)}
<span className="text-sm font-normal text-[rgb(var(--muted))] font-body">/10</span>
</div>
<div className="h-1.5 rounded-full score-bar-track overflow-hidden">
<div
className="h-full rounded-full score-bar-fill"
style={{ width: `${result.potentialScore * 10}%`, background: scoreColor(result.potentialScore) }}
/>
</div>
</div>
</div>

{/* Sub-metric grid */}
<div className="p-6 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-4">Breakdown</span>
<div className="grid grid-cols-2 gap-4">
{result.metrics.map((m, idx) => (
<div key={idx}>
<div className="flex items-center justify-between mb-2.5">
<span className="text-xs text-[rgb(var(--muted-hover))]">{m.label}</span>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))]">{m.score.toFixed(1)}</span>
</div>
<div className="h-1 rounded-full score-bar-track overflow-hidden">
<div
className="h-full rounded-full score-bar-fill"
style={{ width: `${m.score * 10}%`, background: scoreColor(m.score) }}
/>
</div>
</div>
))}
</div>
</div>

{/* Notes */}
<div className="grid grid-cols-2 gap-4">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">Skin Notes</span>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed">{result.skinNotes}</p>
</div>
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">Body Notes</span>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed">{result.bodyNotes}</p>
</div>
</div>

{/* Training */}
<div ref={trainingRef} className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-4">
<Dumbbell className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">Prescribed Training</span>
</div>
<div className="space-y-2">
{result.trainingFocus.map((item, idx) => (
<div key={idx} className="flex items-center gap-2 text-sm text-[rgb(var(--gold))] font-medium">
<CheckCircle2 className="w-3.5 h-3.5 text-[rgb(var(--gold))] flex-shrink-0" />
{item}
</div>
))}
</div>
{!isPremium && (
<div
className="mt-4 pt-4 flex items-center gap-2 text-xs text-[rgb(var(--gold))]"
style={{ borderTop: '1px solid rgb(var(--muted) / 0.15)', opacity: 0.7 }}
>
<Lock className="w-3 h-3" />
Premium unlocks full breakdowns and weekly splits
</div>
)}
</div>

{isPremium && result.premiumInsight && (
<div className="rounded-2xl p-6" style={accentCardStyle}>
<div className="flex items-center gap-2 mb-3">
<Crown className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">Premium Trend Reading</span>
</div>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">{result.premiumInsight}</p>
</div>
)}

{!isPremium && (
<div className="rounded-2xl p-6 flex items-center justify-between gap-4" style={accentCardStyle}>
<div>
<div className="flex items-center gap-2 mb-1">
<Crown className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-sm text-[rgb(var(--gold))] font-medium">Unlock deeper insight</span>
</div>
<p className="text-xs text-[rgb(var(--muted))]">Trend tracking, macros, unlimited readings</p>
</div>
<button
onClick={onGoPremium}
className="flex-shrink-0 font-medium py-2 px-4 rounded-xl text-xs whitespace-nowrap transition-all"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
Go Premium
</button>
</div>
)}

{/* Bottom mini-nav — desktop only; the app's own BottomNav covers this on mobile */}
<div
className="fixed bottom-0 left-0 right-0 backdrop-blur-xl z-20 hidden md:block"
style={{ borderTop: '1px solid rgb(var(--muted) / 0.2)', background: 'rgb(var(--bg) / 0.9)' }}
>
<div className="max-w-2xl mx-auto grid grid-cols-4">
<button onClick={scrollToTop} className="flex flex-col items-center gap-1 py-3 text-[rgb(var(--gold))]">
<Gauge className="w-4 h-4" />
<span className="text-[9px] tracking-wide uppercase">Score</span>
</button>
<button
onClick={isPremium ? scrollToTraining : onGoPremium}
className="flex flex-col items-center gap-1 py-3 text-[rgb(var(--muted))] hover:text-[rgb(var(--muted-hover))] transition-all"
>
<TrendingUp className="w-4 h-4" />
<span className="text-[9px] tracking-wide uppercase">Trend</span>
</button>
<button
onClick={scrollToTraining}
className="flex flex-col items-center gap-1 py-3 text-[rgb(var(--muted))] hover:text-[rgb(var(--muted-hover))] transition-all"
>
<Dumbbell className="w-4 h-4" />
<span className="text-[9px] tracking-wide uppercase">Train</span>
</button>
<button
onClick={resetScan}
className="flex flex-col items-center gap-1 py-3 text-[rgb(var(--muted))] hover:text-[rgb(var(--muted-hover))] transition-all"
>
<RefreshCw className="w-4 h-4" />
<span className="text-[9px] tracking-wide uppercase">Rescan</span>
</button>
</div>
</div>

<button
onClick={shareResult}
className="flex items-center gap-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--muted-hover))] text-xs font-medium transition-all"
>
<Share2 className="w-3 h-3" />
Share Reading
</button>
</div>
)}
</div>
);
}

