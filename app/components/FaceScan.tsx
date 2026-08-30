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

const toRoman = (num: number): string => {
const map: [number, string][] = [
[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
let result = '';
let n = num;
for (const [value, symbol] of map) {
while (n >= value) { result += symbol; n -= value; }
}
return result;
};

export default function FaceScan() {
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
? 'Hydration has improved 12% over your last three scans. Add a lightweight SPF for daytime — sun exposure markers ticked up this week.'
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
<div className="space-y-10 font-body">
{/* Demo toggle */}
<div className="flex items-center justify-between border border-[#7A6E5D]/25 rounded-sm px-5 py-3">
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Demo — toggle tier</span>
<button
onClick={() => setIsPremium(prev => !prev)}
className={`text-[11px] font-medium px-3 py-1.5 rounded-sm transition-all tracking-wide ${
isPremium
? 'border border-[#D4AF6E]/50 text-[#D4AF6E]'
: 'border border-[#7A6E5D]/30 text-[#7A6E5D]'
}`}
>
{isPremium ? 'Premium' : 'Free'}
</button>
</div>

{/* Header */}
<div className="flex items-center justify-between pb-6 border-b border-[#7A6E5D]/20">
<div>
<span className="text-[10px] tracking-[0.35em] text-[#D4AF6E] uppercase block mb-2">Reading</span>
<h2 className="font-display text-2xl text-[#D4AF6E] font-light">Face &amp; Body Scan</h2>
</div>
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] tracking-wide ${
isPremium ? 'border-[#D4AF6E]/40 text-[#D4AF6E]' : 'border-[#7A6E5D]/30 text-[#7A6E5D]'
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
<ImageIcon className="w-7 h-7 text-[#D4AF6E]" />
</div>
</div>
<h3 className="font-display text-lg text-[#D4AF6E] font-light mb-2">Ready when you are</h3>
<p className="text-sm text-[#7A6E5D] mb-8 max-w-xs">
Position your face and upper body in frame. Good lighting reads best.
</p>

{canScan ? (
<div className="flex gap-3">
<button
onClick={startCamera}
className="flex items-center gap-2 border border-[#D4AF6E]/50 hover:border-[#D4AF6E] hover:bg-[#D4AF6E]/[0.06] text-[#D4AF6E] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide"
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
<button className="flex items-center gap-2 border border-[#D4AF6E]/50 hover:border-[#D4AF6E] text-[#D4AF6E] font-medium py-3 px-6 rounded-sm transition-all text-[13px] tracking-wide mx-auto">
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
<div className="relative w-full max-w-md aspect-square overflow-hidden bg-[#12100C] border border-[#7A6E5D]/20 mb-6">
{cameraActive && !imagePreview && (
<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
)}
{imagePreview && (
<img src={imagePreview} alt="Captured preview" className="w-full h-full object-cover" />
)}
<button
onClick={cancelCapture}
className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[#D4AF6E] hover:bg-black/70 transition-all"
>
<X className="w-4 h-4" />
</button>
</div>

{cameraActive && !imagePreview && (
<button
onClick={capturePhoto}
className="border border-[#D4AF6E]/50 hover:border-[#D4AF6E] hover:bg-[#D4AF6E]/[0.06] text-[#D4AF6E] font-medium py-3 px-8 rounded-sm transition-all text-[13px] tracking-wide"
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
className="flex items-center gap-2 border border-[#D4AF6E]/50 hover:border-[#D4AF6E] hover:bg-[#D4AF6E]/[0.06] text-[#D4AF6E] font-medium py-3 px-8 rounded-sm transition-all text-[13px] tracking-wide"
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
<div className="border border-[#7A6E5D]/20 rounded-sm p-12 flex flex-col items-center text-center">
{imagePreview && (
<img src={imagePreview} alt="Scanning" className="w-28 h-28 object-cover mb-6 opacity-50 border border-[#7A6E5D]/20" />
)}
<div className="relative w-14 h-14 mb-6">
<svg className="w-14 h-14 -rotate-90 animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 96 96">
<circle cx="48" cy="48" r="42" fill="none" stroke="#D4AF6E" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="60 200" />
</svg>
</div>
<h3 className="font-display text-lg text-[#D4AF6E] font-light mb-2">Reading in progress</h3>
<p className="text-sm text-[#7A6E5D]">Measuring skin and physique markers</p>
</div>
)}

{/* Result */}
{status === 'result' && result && (
<div className="space-y-8">
{imagePreview && (
<div className="flex justify-center">
<img src={imagePreview} alt="Scanned" className="w-20 h-20 object-cover border border-[#D4AF6E]/30" />
</div>
)}

<div className="grid grid-cols-2 gap-8">
<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Skin</span>
<div className="font-display text-4xl text-[#D4AF6E] mb-3">{toRoman(result.skinScore)}<span className="text-sm text-[#7A6E5D] font-body"> / C</span></div>
<p className="text-xs text-[#B0A48F] leading-relaxed">{result.skinNotes}</p>
</div>
<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Body</span>
<div className="font-display text-4xl text-[#D4AF6E] mb-3">{toRoman(result.bodyScore)}<span className="text-sm text-[#7A6E5D] font-body"> / C</span></div>
<p className="text-xs text-[#B0A48F] leading-relaxed">{result.bodyNotes}</p>
</div>
</div>

<div className="border-t border-[#7A6E5D]/20 pt-6">
<div className="flex items-center gap-2 mb-4">
<Dumbbell className="w-3.5 h-3.5 text-[#D4AF6E]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Prescribed Training</span>
</div>
<div className="space-y-2">
{result.trainingFocus.map((item, idx) => (
<div key={idx} className="flex items-center gap-2 text-sm text-[#D4AF6E] font-light">
<CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF6E] flex-shrink-0" />
{item}
</div>
))}
</div>
{!isPremium && (
<div className="mt-4 pt-4 border-t border-[#7A6E5D]/15 flex items-center gap-2 text-xs text-[#D4AF6E]/70">
<Lock className="w-3 h-3" />
Premium unlocks full breakdowns and weekly splits
</div>
)}
</div>

{isPremium && result.premiumInsight && (
<div className="border border-[#D4AF6E]/30 rounded-sm p-6">
<div className="flex items-center gap-2 mb-3">
<Crown className="w-4 h-4 text-[#D4AF6E]" />
<span className="text-[10px] tracking-[0.2em] text-[#D4AF6E] uppercase">Premium Trend Reading</span>
</div>
<p className="text-sm text-[#B0A48F] leading-relaxed">{result.premiumInsight}</p>
</div>
)}

{!isPremium && (
<div className="border border-[#D4AF6E]/30 rounded-sm p-6 flex items-center justify-between gap-4">
<div>
<div className="flex items-center gap-2 mb-1">
<Crown className="w-4 h-4 text-[#D4AF6E]" />
<span className="text-sm text-[#D4AF6E] font-medium">Unlock deeper insight</span>
</div>
<p className="text-xs text-[#7A6E5D]">Trend tracking, macros, unlimited readings</p>
</div>
<button className="flex-shrink-0 border border-[#D4AF6E]/50 hover:border-[#D4AF6E] text-[#D4AF6E] font-medium py-2 px-4 rounded-sm text-xs whitespace-nowrap transition-all">
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

