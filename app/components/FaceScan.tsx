'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Lock, Dumbbell, Crown, RefreshCw, CheckCircle2, X, ImageIcon } from 'lucide-react';

type ScanResult = {
skinScore: number;
bodyScore: number;
skinNotes: string;
bodyNotes: string;
trainingFocus: string[];
premiumInsight?: string;
};

export default function FaceScan() {
// DEMO TOGGLE — remove once real auth/subscriptions are wired up
const [isPremium, setIsPremium] = useState(false);

const [scansUsedToday, setScansUsedToday] = useState(0);
const [status, setStatus] = useState<'idle' | 'capture' | 'scanning' | 'result'>('idle');
const [result, setResult] = useState<ScanResult | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

const fileInputRef = useRef<HTMLInputElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);
const [cameraActive, setCameraActive] = useState(false);

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
ctx?.drawImage(video, 0, 0);
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

// Simulated AI processing — replace with real vision API call later
setTimeout(() => {
const mockResult: ScanResult = {
skinScore: Math.floor(Math.random() * 15) + 78,
bodyScore: Math.floor(Math.random() * 15) + 70,
skinNotes: 'Mild dehydration detected around the T-zone. Barrier function looks healthy overall.',
bodyNotes: 'Posture is slightly forward-leaning. Shoulder symmetry is good.',
trainingFocus: isPremium
? ['Posterior chain (deadlifts, rows)', 'Core stability — anti-rotation work', 'Mobility: thoracic spine']
: ['General full-body strength training'],
premiumInsight: isPremium
? 'Based on your last 3 scans, your skin hydration has improved 12%. Keep the current routine but add a lightweight SPF for daytime — your sun exposure markers ticked up this week.'
: undefined,
};
setResult(mockResult);
setStatus('result');
if (!isPremium) setScansUsedToday(prev => prev + 1);
}, 2200);
};

const resetScan = () => {
setStatus('idle');
setResult(null);
setImagePreview(null);
};

return (
<div className="space-y-8">
{/* Demo toggle — dev only */}
<div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
<span className="text-xs text-slate-500">DEMO: Toggle account tier to preview both experiences</span>
<button
onClick={() => setIsPremium(prev => !prev)}
className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
isPremium
? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
: 'bg-slate-800 text-slate-400 border border-slate-700'
}`}
>
{isPremium ? '★ Premium View' : 'Free View'}
</button>
</div>

{/* Header */}
<div className="flex items-center justify-between">
<div>
<h2 className="text-lg font-semibold tracking-tight text-white mb-1">Face & Body Scan</h2>
<p className="text-sm text-slate-500 font-light">AI-powered analysis of your skin and physique</p>
</div>
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
isPremium
? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
: 'bg-slate-800/50 border-slate-700 text-slate-400'
}`}>
{isPremium && <Crown className="w-3 h-3" />}
{isPremium ? 'Unlimited Scans' : `${scansLeft} scan left today`}
</div>
</div>

<input
ref={fileInputRef}
type="file"
accept="image/*"
onChange={handleFileChange}
className="hidden"
/>

{/* Idle State — choose upload or camera */}
{status === 'idle' && (
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-10 flex flex-col items-center text-center">
<div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
<ImageIcon className="w-8 h-8 text-emerald-400" />
</div>
<h3 className="text-white font-medium mb-2">Ready for your scan</h3>
<p className="text-sm text-slate-500 font-light mb-6 max-w-sm">
Position your face and upper body in frame. Good lighting gives the most accurate results.
</p>

{canScan ? (
<div className="flex gap-3">
<button
onClick={startCamera}
className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-6 rounded-lg transition-all text-sm"
>
<Camera className="w-4 h-4" />
Use Camera
</button>
<button
onClick={openFilePicker}
className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-lg transition-all text-sm"
>
<Upload className="w-4 h-4" />
Upload Photo
</button>
</div>
) : (
<div className="space-y-3">
<div className="flex items-center gap-2 text-slate-500 text-sm justify-center">
<Lock className="w-4 h-4" />
Daily free scan used
</div>
<button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold py-3 px-8 rounded-lg transition-all text-sm flex items-center gap-2 mx-auto">
<Crown className="w-4 h-4" />
Upgrade for Unlimited Scans
</button>
</div>
)}
</div>
)}

{/* Capture State — camera live view or image preview */}
{status === 'capture' && (
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center">
<div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-slate-900 mb-6">
{cameraActive && !imagePreview && (
<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
)}
{imagePreview && (
<img src={imagePreview} alt="Captured preview" className="w-full h-full object-cover" />
)}
<button
onClick={cancelCapture}
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button
onClick={capturePhoto}
className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-8 rounded-lg transition-all text-sm"
>
Capture Photo
</button>
)}

{imagePreview && (
<div className="flex gap-3">
<button
onClick={() => { setImagePreview(null); startCamera(); }}
className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-slate-700 text-slate-300 font-medium py-3 px-6 rounded-lg transition-all text-sm"
>
<RefreshCw className="w-4 h-4" />
Retake
</button>
<button
onClick={runScan}
className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-8 rounded-lg transition-all text-sm"
>
<Sparkles className="w-4 h-4" />
Analyze Photo
</button>
</div>
)}
</div>
)}

{/* Scanning State */}
{status === 'scanning' && (
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-10 flex flex-col items-center text-center">
{imagePreview && (
<img src={imagePreview} alt="Scanning" className="w-32 h-32 rounded-xl object-cover mb-6 opacity-60" />
)}
<div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 animate-pulse">
<Sparkles className="w-7 h-7 text-emerald-400" />
</div>
<h3 className="text-white font-medium mb-2">Analyzing...</h3>
<p className="text-sm text-slate-500 font-light">Our AI is scanning your skin and physique markers</p>
</div>
)}

{/* Result State */}
{status === 'result' && result && (
<div className="space-y-6">
{imagePreview && (
<div className="flex justify-center">
<img src={imagePreview} alt="Scanned" className="w-24 h-24 rounded-xl object-cover border border-emerald-500/20" />
</div>
)}

<div className="grid grid-cols-2 gap-4">
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
<p className="text-xs text-slate-500 font-medium tracking-wide mb-2">SKIN SCORE</p>
<div className="text-4xl font-light text-emerald-400 mb-3">{result.skinScore}<span className="text-lg text-slate-600">/100</span></div>
<p className="text-xs text-slate-400 font-light leading-relaxed">{result.skinNotes}</p>
</div>
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
<p className="text-xs text-slate-500 font-medium tracking-wide mb-2">BODY SCORE</p>
<div className="text-4xl font-light text-teal-400 mb-3">{result.bodyScore}<span className="text-lg text-slate-600">/100</span></div>
<p className="text-xs text-slate-400 font-light leading-relaxed">{result.bodyNotes}</p>
</div>
</div>

<div className="backdrop-blur-md bg-white/[0.02] border border-slate-800/50 rounded-xl p-6">
<div className="flex items-center gap-2 mb-4">
<Dumbbell className="w-4 h-4 text-emerald-400" />
<h3 className="text-sm font-semibold text-white">Recommended Training Focus</h3>
</div>
<div className="space-y-2">
{result.trainingFocus.map((item, idx) => (
<div key={idx} className="flex items-center gap-2 text-sm text-slate-300 font-light">
<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
{item}
</div>
))}
</div>
{!isPremium && (
<div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-amber-400/80">
<Lock className="w-3 h-3" />
Premium unlocks detailed exercise breakdowns and weekly split recommendations
</div>
)}
</div>

{isPremium && result.premiumInsight && (
<div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-6">
<div className="flex items-center gap-2 mb-3">
<Crown className="w-4 h-4 text-amber-400" />
<h3 className="text-sm font-semibold text-amber-400">Premium Insight — Trend Analysis</h3>
</div>
<p className="text-sm text-slate-300 font-light leading-relaxed">{result.premiumInsight}</p>
</div>
)}

{!isPremium && (
<div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-6 flex items-center justify-between">
<div>
<div className="flex items-center gap-2 mb-1">
<Crown className="w-4 h-4 text-amber-400" />
<h3 className="text-sm font-semibold text-amber-400">Unlock deeper insights</h3>
</div>
<p className="text-xs text-slate-400 font-light">Trend tracking, personalized macros, and unlimited daily scans</p>
</div>
<button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2 px-4 rounded-lg text-xs whitespace-nowrap transition-all">
Go Premium
</button>
</div>
)}

<button
onClick={resetScan}
className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-medium transition-all"
>
<RefreshCw className="w-3 h-3" />
{canScan || isPremium ? 'Scan Again' : 'Back'}
</button>
</div>
)}
</div>
);
}

