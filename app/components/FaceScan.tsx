'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Upload, Sparkles, Lock, Dumbbell, Crown, RefreshCw, CheckCircle2, X, ImageIcon } from 'lucide-react';

type ScanResult = {
skinScore: number;
bodyScore: number;
skinNotes: string;
bodyNotes: string;
trainingFocus: string[];
premiumInsight?: string;
};

const MALE_COPY = {
skinNotes: [
'Mild dehydration around the T-zone. Barrier function looks healthy overall — a lightweight daily moisturizer will help.',
'Slight oil buildup around the jawline, common with regular shaving. Skin tone is even.',
'Skin recovery looks solid. Minor sun exposure markers on the forehead — daytime SPF would help long-term.',
],
bodyNotes: [
'Posture is slightly forward-leaning, likely from desk time. Shoulder width and symmetry are good.',
'Upper body development is ahead of lower body — legs could use more volume.',
'Good overall symmetry. Core engagement looks slightly weak in the lower abdomen.',
],
training: [
['Posterior chain (deadlifts, rows)', 'Core stability — anti-rotation work', 'Mobility: thoracic spine'],
['Leg day priority — squats, lunges', 'Upper body maintenance volume', 'Hip mobility work'],
['Full-body compound lifts', 'Progressive overload on bench and squat', 'Weekly mobility session'],
],
};

const FEMALE_COPY = {
skinNotes: [
'Mild dehydration around the cheeks. Barrier function looks healthy — a richer night cream would help.',
'Even tone overall, slight redness near the nose. A gentle barrier-repair serum would help.',
'Skin looks well hydrated. Minor sun exposure markers detected — daytime SPF recommended.',
],
bodyNotes: [
'Posture is slightly forward-leaning. Shoulder and hip alignment are well balanced.',
'Good muscle tone throughout. Core engagement could be a touch stronger.',
'Overall symmetry is strong. Lower body strength is slightly ahead of upper body.',
],
training: [
['Glute-focused lower body work', 'Core stability — anti-rotation work', 'Mobility: hips and thoracic spine'],
['Upper body strength priority', 'Progressive overload on compound lifts', 'Weekly mobility session'],
['Full-body strength training', 'Core and posture work', 'Light cardio for recovery days'],
],
};

type FaceScanProps = {
isPremium: boolean;
onGoPremium: () => void;
};

export default function FaceScan({ isPremium, onGoPremium }: FaceScanProps) {
const [gender, setGender] = useState<'male' | 'female' | null>(null);
const [scansUsedToday, setScansUsedToday] = useState(0);
const [status, setStatus] = useState<'idle' | 'capture' | 'scanning' | 'result'>('idle');
const [result, setResult] = useState<ScanResult | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

const fileInputRef = useRef<HTMLInputElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);
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

const mockResult: ScanResult = {
skinScore: Math.floor(Math.random() * 15) + 78,
bodyScore: Math.floor(Math.random() * 15) + 70,
skinNotes: pick(copy.skinNotes),
bodyNotes: pick(copy.bodyNotes),
trainingFocus: isPremium ? pick(copy.training) : [pick(copy.training)[0]],
premiumInsight: isPremium
? 'Hydration has improved 12% over your last three scans. Add a lightweight SPF for daytime — sun exposure markers ticked up this week.'
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

return (
<div className="space-y-10 font-body">
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
background: linear-gradient(90deg, transparent, #C9A24B, transparent);
box-shadow: 0 0 12px 2px rgba(201,162,75,0.6);
animation: scanLine 2s ease-in-out infinite;
}
.scan-grid {
background-image: linear-gradient(rgba(201,162,75,0.08) 1px, transparent 1px),
linear-gradient(90deg, rgba(201,162,75,0.08) 1px, transparent 1px);
background-size: 20px 20px;
animation: scanPulse 2s ease-in-out infinite;
}
`}</style>

{/* Header */}
<div className="flex items-center justify-between pb-6 border-b border-[#7A6E5D]/20">
<div>
<span className="text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase block mb-2">Reading</span>
<h2 className="font-display text-2xl text-[#C9A24B] font-light">Face &amp; Body Scan</h2>
</div>
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] tracking-wide ${
isPremium ? 'border-[#C9A24B]/40 text-[#C9A24B]' : 'border-[#7A6E5D]/30 text-[#7A6E5D]'
}`}>
{isPremium && <Crown className="w-3 h-3" />}
{isPremium ? 'Unlimited' : `${scansLeft} scan left today`}
</div>
</div>

<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

{/* Idle */}
{status === 'idle' && (
<div className="border border-[#7A6E5D]/20 rounded-sm p-12 flex flex-col items-center text-center">
<div className="relative w-20 h-20 mb-6">
<svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
<circle cx="48" cy="48" r="44" fill="none" stroke="#7A6E5D" strokeOpacity="0.25" strokeWidth="1" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<ImageIcon className="w-7 h-7 text-[#C9A24B]" />
</div>
</div>
<h3 className="font-display text-lg text-[#C9A24B] font-light mb-2">Ready when you are</h3>
<p className="text-sm text-[#7A6E5D] mb-8 max-w-xs">
Position your face and upper body in frame. Good lighting reads best.
</p>

{canScan ? (
<div className="flex gap-3">
<button
onClick={startCamera}
className="flex items-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.06] text-[#C9A24B] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide"
>
<Camera className="w-4 h-4" />
Use Camera
</button>
<button
onClick={openFilePicker}
className="flex items-center gap-2 border border-[#7A6E5D]/30 hover:border-[#7A6E5D]/60 text-[#B0A48F] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide"
>
<Upload className="w-4 h-4" />
Upload Photo
</button>
</div>
) : (
<div className="space-y-4">
<div className="flex items-center gap-2 text-[#7A6E5D] text-sm justify-center">
<Lock className="w-4 h-4" />
Today&apos;s free reading is spent
</div>
<button
onClick={onGoPremium}
className="flex items-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] text-[#C9A24B] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide mx-auto"
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
<div className="border border-[#7A6E5D]/20 rounded-sm p-6 flex flex-col items-center">
<div className="relative w-full max-w-md aspect-square overflow-hidden bg-[#0D0D0D] border border-[#7A6E5D]/20 mb-6">
{cameraActive && !imagePreview && (
<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
)}
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Captured preview" className="w-full h-full object-cover" />
)}
<button
onClick={cancelCapture}
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[#C9A24B] hover:bg-black/70 transition-all"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button
onClick={capturePhoto}
className="border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.06] text-[#C9A24B] font-medium py-3 px-8 rounded-sm transition-all text-[13px] tracking-wide"
>
Capture
</button>
)}

{imagePreview && (
<div className="flex gap-3">
<button
onClick={() => { setImagePreview(null); startCamera(); }}
className="flex items-center gap-2 border border-[#7A6E5D]/30 text-[#B0A48F] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide"
>
<RefreshCw className="w-4 h-4" />
Retake
</button>
<button
onClick={runScan}
className="flex items-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.06] text-[#C9A24B] font-medium py-3 px-8 rounded-sm transition-all text-[13px] tracking-wide"
>
<Sparkles className="w-4 h-4" />
Analyze
</button>
</div>
)}
</div>
)}

{/* Scanning — real visual over the actual photo */}
{status === 'scanning' && (
<div className="border border-[#7A6E5D]/20 rounded-sm p-6 flex flex-col items-center">
<div className="relative w-full max-w-md aspect-square overflow-hidden bg-[#0D0D0D] border border-[#C9A24B]/30 mb-6">
{imagePreview && (
// eslint-disable-next-line @next/next/no-img-element
<img src={imagePreview} alt="Scanning" className="w-full h-full object-cover opacity-70" />
)}
<div className="absolute inset-0 scan-grid" />
<div className="scan-line" />
<div className="absolute top-3 left-3 text-[10px] tracking-[0.2em] text-[#C9A24B] uppercase bg-black/50 px-2 py-1 rounded-sm">
Analyzing
</div>
</div>
<h3 className="font-display text-lg text-[#C9A24B] font-light mb-2">Reading in progress</h3>
<p className="text-sm text-[#7A6E5D]">Measuring skin and physique markers</p>
</div>
)}

{/* Result */}
{status === 'result' && result && (
<div className="space-y-8">
{imagePreview && (
<div className="flex justify-center">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={imagePreview} alt="Scanned" className="w-20 h-20 object-cover border border-[#C9A24B]/30" />
</div>
)}

<div className="grid grid-cols-2 gap-8">
<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Skin</span>
<div className="font-display text-4xl text-[#C9A24B] mb-3">{result.skinScore}<span className="text-sm text-[#7A6E5D] font-body">/100</span></div>
<p className="text-xs text-[#B0A48F] leading-relaxed">{result.skinNotes}</p>
</div>
<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Body</span>
<div className="font-display text-4xl text-[#C9A24B] mb-3">{result.bodyScore}<span className="text-sm text-[#7A6E5D] font-body">/100</span></div>
<p className="text-xs text-[#B0A48F] leading-relaxed">{result.bodyNotes}</p>
</div>
</div>

<div className="border-t border-[#7A6E5D]/20 pt-6">
<div className="flex items-center gap-2 mb-4">
<Dumbbell className="w-3.5 h-3.5 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Prescribed Training</span>
</div>
<div className="space-y-2">
{result.trainingFocus.map((item, idx) => (
<div key={idx} className="flex items-center gap-2 text-sm text-[#C9A24B] font-light">
<CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24B] flex-shrink-0" />
{item}
</div>
))}
</div>
{!isPremium && (
<div className="mt-4 pt-4 border-t border-[#7A6E5D]/15 flex items-center gap-2 text-xs text-[#C9A24B]/70">
<Lock className="w-3 h-3" />
Premium unlocks full breakdowns and weekly splits
</div>
)}
</div>

{isPremium && result.premiumInsight && (
<div className="border border-[#C9A24B]/30 rounded-sm p-6">
<div className="flex items-center gap-2 mb-3">
<Crown className="w-4 h-4 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#C9A24B] uppercase">Premium Trend Reading</span>
</div>
<p className="text-sm text-[#B0A48F] leading-relaxed">{result.premiumInsight}</p>
</div>
)}

{!isPremium && (
<div className="border border-[#C9A24B]/30 rounded-sm p-6 flex items-center justify-between gap-4">
<div>
<div className="flex items-center gap-2 mb-1">
<Crown className="w-4 h-4 text-[#C9A24B]" />
<span className="text-sm text-[#C9A24B] font-medium">Unlock deeper insight</span>
</div>
<p className="text-xs text-[#7A6E5D]">Trend tracking, macros, unlimited readings</p>
</div>
<button
onClick={onGoPremium}
className="flex-shrink-0 border border-[#C9A24B]/50 hover:border-[#C9A24B] text-[#C9A24B] font-medium py-2 px-4 rounded-sm text-xs whitespace-nowrap transition-all"
>
Go Premium
</button>
</div>
)}

<button
onClick={resetScan}
className="flex items-center gap-2 text-[#7A6E5D] hover:text-[#B0A48F] text-xs font-medium transition-all"
>
<RefreshCw className="w-3 h-3" />
{canScan || isPremium ? 'Read Again' : 'Back'}
</button>
</div>
)}
</div>
);
}

