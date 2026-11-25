'use client';

// app/components/SkinStudio.tsx — Potentia Skin: skin maps on your own selfie, skin age, your skin in 10 years,
// weekly progress and a routine with Shop products.
// Free: the dark-spot map (made on the phone). Potentia Skin (a skin plan or a one-time report): everything.
// Selfies use the app's own mirrored camera (like the face scan), so the photo never flips.

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { analyzeFace, FaceAnalysisError } from '../../lib/faceAnalysis';
import { makeSkinMaps, MAP_KEYS, MAP_COLORS, type MapKey, type SkinMaps } from '../../lib/skinMaps';
import { toAiImage, callAi, aiErrorText } from '../../lib/aiClient';
import { fmtMMK, planMmk } from '../../lib/payments';
import { track } from '../../lib/track';
import ScanPicks from './ScanPicks';
import type { SkinReport } from '../api/ai/skin/route';
import { Camera, ImagePlus, Loader2, Lock, Sparkles, Sun, Moon, Clock, TrendingDown, TrendingUp, RefreshCw, X } from 'lucide-react';

const ROSE = '#F2A6BC';
const ROSE_INK = '#2B1220';
const card: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};
const roseCard: React.CSSProperties = { ...card, border: `1px solid ${ROSE}66`, background: 'linear-gradient(160deg, rgba(242,166,188,0.10), rgb(var(--surface) / 0.45))' };

type Access = { access: 'none' | 'plan' | 'premium' | 'report'; until: string | null; reports: number; birth_year: number | null };
type PrevScan = { created_at: string; maps: Partial<Record<MapKey, number>>; skin_age: number | null; score: number | null };

const MAP_NAME: Record<MapKey | 'all', [string, string]> = {
spots: ['Dark spots', 'အမည်းစက်'],
redness: ['Redness', 'အနီကွက်'],
oil: ['Oil & shine', 'အဆီ'],
texture: ['Texture & pores', 'ချွေးပေါက်/မညီညာမှု'],
all: ['All', 'အားလုံး'],
};
const CONCERN_NAME: Record<string, [string, string]> = {
dark_spots: ['Dark spots', 'အမည်းစက်များ'],
melasma: ['Melasma (brown patches)', 'တင်းကွက် / အမည်းကွက်ကြီးများ'],
redness: ['Redness', 'အနီကွက်'],
oiliness: ['Oily skin', 'အဆီပြန်ခြင်း'],
pores: ['Large pores', 'ချွေးပေါက်ကျယ်ခြင်း'],
acne: ['Acne', 'ဝက်ခြံ'],
wrinkles: ['Wrinkles & fine lines', 'အရေးအကြောင်း'],
under_eye: ['Under-eye darkness', 'မျက်ကွင်းညို'],
dullness: ['Dull skin', 'အသားအရေ မွဲခြောက်ခြင်း'],
dryness: ['Dryness', 'အသားအရေ ခြောက်ခြင်း'],
};
const ZONE_NAME: Record<string, [string, string]> = {
forehead: ['forehead', 'နဖူး'],
left_cheek: ['left cheek', 'ဘယ်ပါး'],
right_cheek: ['right cheek', 'ညာပါး'],
nose: ['nose', 'နှာခေါင်း'],
chin: ['chin', 'မေးစေ့'],
under_eyes: ['under the eyes', 'မျက်လုံးအောက်'],
};
// AI concerns -> the Shop matcher's skin keys (lib/recommend.ts)
const PICK_KEY: Record<string, string> = {
under_eye: 'dark_circles',
redness: 'redness',
dark_spots: 'evenness',
melasma: 'evenness',
dullness: 'evenness',
oiliness: 'shine',
pores: 'pores',
acne: 'pores',
wrinkles: 'eye_texture',
};

export default function SkinStudio({ isGuest, onGoSkin }: { isGuest: boolean; onGoSkin: () => void }) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const N = (pair: [string, string]) => (lang === 'my' ? pair[1] : pair[0]);
const [uid, setUid] = useState<string | null>(null);
const [gender, setGender] = useState<'male' | 'female'>('female');
const [acc, setAcc] = useState<Access | null>(null);
const [prev, setPrev] = useState<PrevScan | null>(null);
const [status, setStatus] = useState<'idle' | 'reading' | 'ai' | 'done' | 'error'>('idle');
const [error, setError] = useState('');
const [crop, setCrop] = useState<string | null>(null);
const [maps, setMaps] = useState<SkinMaps | null>(null);
const [view, setView] = useState<MapKey | 'all'>('spots');
const [report, setReport] = useState<SkinReport | null>(null);
const [aging, setAging] = useState<{ noCare: string; withCare: string } | null>(null);
const [agingBusy, setAgingBusy] = useState(false);
const [agingErr, setAgingErr] = useState('');
const selfieRef = useRef<HTMLInputElement | null>(null);
const galleryRef = useRef<HTMLInputElement | null>(null);
const videoRef = useRef<HTMLVideoElement | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const [camOn, setCamOn] = useState(false);

const stopCam = () => {
streamRef.current?.getTracks().forEach(t => t.stop());
streamRef.current = null;
setCamOn(false);
};
useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

// the app's own front camera, shown mirrored like a mirror; the photo is saved the same way
const openCam = async () => {
try {
const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1440 }, height: { ideal: 1440 } }, audio: false });
streamRef.current = stream;
setCamOn(true);
setTimeout(() => {
if (videoRef.current) videoRef.current.srcObject = stream;
}, 50);
} catch {
selfieRef.current?.click(); // no camera permission: fall back to the phone camera
}
};

const snap = () => {
const v = videoRef.current;
if (!v || !v.videoWidth) return;
const c = document.createElement('canvas');
c.width = v.videoWidth;
c.height = v.videoHeight;
const x = c.getContext('2d');
if (!x) return;
x.translate(c.width, 0);
x.scale(-1, 1);
x.drawImage(v, 0, 0);
const shot = c.toDataURL('image/jpeg', 0.92);
stopCam();
run(shot);
};

const paid = !!acc && acc.access !== 'none';
const age = acc?.birth_year ? new Date().getFullYear() - acc.birth_year : null;

const loadAccess = async () => {
const { data } = await supabase.rpc('my_skin_access');
if (data) setAcc(data as Access);
};

useEffect(() => {
(async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) return;
setUid(session.user.id);
const [{ data: p }, { data: last }] = await Promise.all([
supabase.from('profiles').select('gender').eq('id', session.user.id).single(),
supabase.from('skin_scans').select('created_at, maps, skin_age, score').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1),
]);
if (p?.gender === 'male' || p?.gender === 'female') setGender(p.gender);
if (last && last[0]) setPrev(last[0] as PrevScan);
await loadAccess();
})();
}, []);

const run = async (input: File | string | undefined) => {
if (!input) return;
setError('');
setReport(null);
setAging(null);
setMaps(null);
setStatus('reading');
track('scan_start', { source: 'skin' });
try {
const photo = typeof input === 'string' ? input : await toAiImage(input, 1400, 0.92);
// 1. find the face (on the phone) so the maps only cover skin
const face = await analyzeFace(photo, gender);
const faceImg = face.croppedImage ?? photo;
setCrop(faceImg);
const m = await makeSkinMaps(faceImg, { landmarks: face.landmarks as { x: number; y: number }[] | undefined });
setMaps(m);
setView(paid ? 'all' : 'spots');

// 2. the AI report (Potentia Skin only)
let rep: SkinReport | null = null;
if (paid) {
setStatus('ai');
const img = await toAiImage(faceImg, 1024, 0.9);
const r = await callAi<{ report?: SkinReport; usable?: boolean; reason?: string; minor?: boolean }>('/api/ai/skin', { image: img, gender, age });
if (!r.ok) {
setError(r.code === 'skin' ? L('Potentia Skin has ended. Renew to see the full report.', 'Potentia Skin ကုန်သွားပါပြီ။ Report အပြည့်ကြည့်ဖို့ ပြန်ဝယ်ပါ။') : L(aiErrorText(r.code), 'တစ်ခုခု မှားသွားပါတယ်။ ပြန်ကြိုးစားပါ။'));
} else if (r.data.minor) {
setError(L('Potentia is for people 18 and over.', 'Potentia ကို အသက် ၁၈ နှစ်နှင့်အထက်သာ သုံးနိုင်ပါတယ်။'));
} else if (!r.data.report) {
setError(r.data.reason ?? L('Use a clear selfie in daylight, no filter.', 'နေ့အလင်းမှာ filter မပါဘဲ ရှင်းရှင်း selfie ရိုက်ပါ။'));
} else {
rep = r.data.report;
setReport(rep);
}
loadAccess(); // a one-time report is used up now
}

// 3. save the numbers (never the photo) for next week's comparison
if (uid) {
await supabase.from('skin_scans').insert({
user_id: uid,
maps: m.coverage,
score: rep?.score ?? null,
skin_age: rep?.skin_age ?? null,
report: rep,
});
}
setStatus('done');
} catch (e) {
const code = e instanceof FaceAnalysisError ? e.code : 'IMAGE_FAILED';
setError(
code === 'NO_FACE'
? L('No face found. Hold the phone in front of you, face the light.', 'မျက်နှာ မတွေ့ပါ။ ဖုန်းကို ရှေ့မှာ ကိုင်ပြီး အလင်းဘက် လှည့်ပါ။')
: code === 'NOT_FRONTAL'
? L('Look straight at the camera, chin level.', 'ကင်မရာကို တည့်တည့် ကြည့်ပါ။')
: code === 'EXPRESSION'
? L('Keep a neutral face, mouth closed, eyes open.', 'မျက်နှာ ပုံမှန်ထား၊ ပါးစပ်ပိတ်၊ မျက်လုံးဖွင့်ထားပါ။')
: code === 'TOO_CLOSE' || code === 'TOO_SMALL'
? L('Hold the phone at arm’s length with your whole face in the photo.', 'လက်တစ်ကမ်းအကွာမှာ ကိုင်ပြီး မျက်နှာတစ်ခုလုံး ပါအောင် ရိုက်ပါ။')
: L('That photo could not be read. Try another one.', 'ဒီဓာတ်ပုံကို ဖတ်လို့ မရပါ။ တခြားတစ်ပုံ စမ်းပါ။')
);
track('scan_fail', { code: `skin_${String(code)}` });
setStatus('error');
}
};

const runAging = async () => {
if (!crop || agingBusy) return;
setAgingBusy(true);
setAgingErr('');
const img = await toAiImage(crop, 1024, 0.9);
const r = await callAi<{ noCare: string; withCare: string }>('/api/ai/skin-age', { image: img, gender, age: age ?? report?.skin_age ?? null });
setAgingBusy(false);
if (!r.ok) {
return setAgingErr(
r.code === 'limit'
? L('You used today’s 2 previews. Try again tomorrow.', 'ဒီနေ့ preview ၂ ကြိမ် သုံးပြီးပါပြီ။ မနက်ဖြန် ပြန်စမ်းပါ။')
: r.code === 'skin'
? L('Included with Potentia Skin.', 'Potentia Skin နဲ့ ရပါတယ်။')
: L(aiErrorText(r.code), 'တစ်ခုခု မှားသွားပါတယ်။')
);
}
setAging(r.data);
};

const setYear = async (y: number) => {
const { error: err } = await supabase.rpc('set_birth_year', { p_year: y });
if (!err) setAcc(a => (a ? { ...a, birth_year: y } : a));
};

const pct = (k: MapKey) => maps?.coverage[k] ?? 0;
const change = (k: MapKey) => {
const before = prev?.maps?.[k];
if (before == null || !maps || before < 0.5) return null;
return Math.round(((pct(k) - before) / before) * 100);
};
const concerns = (report?.concerns ?? []).filter(c => c.severity >= 2).sort((a, b) => b.severity - a.severity);
const pickScan = report
? {
skin: { items: concerns.filter(c => PICK_KEY[c.key]).map(c => ({ key: PICK_KEY[c.key], score: 10 - c.severity })) },
ai: { sub: { skin: report.score } },
}
: null;

/* ---------------- UI ---------------- */
return (
<div className="space-y-5 font-body max-w-xl mx-auto">
{/* header */}
<div className="p-5 rounded-2xl" style={roseCard}>
<div className="flex items-center gap-2 mb-1.5">
<Sparkles className="w-4 h-4" style={{ color: ROSE }} />
<span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: ROSE }}>
Potentia Skin
</span>
</div>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{L('Know your skin', 'သင့်အသားအရေကို သိပါ')}</h2>
<p className="text-xs text-[rgb(var(--muted-hover))] mt-2 leading-relaxed">
{L(
'Skin maps on your own face, your skin age, your skin in 10 years, and a routine that fits you. Track it every week.',
'သင့်မျက်နှာပေါ်မှာ အသားအရေ မြေပုံ၊ အသားအရေ အသက်၊ ၁၀ နှစ်နောက် သင့်အသားအရေ၊ သင်နဲ့ကိုက်တဲ့ routine။ အပတ်တိုင်း စောင့်ကြည့်ပါ။'
)}
</p>
{acc && acc.access !== 'none' && (
<p className="text-[11px] mt-3" style={{ color: ROSE }}>
{acc.access === 'premium'
? L('Included with your Premium plan', 'သင့် Premium plan မှာ ပါဝင်ပါတယ်')
: acc.access === 'report'
? L(`${acc.reports} full report left`, `Report အပြည့် ${acc.reports} ခု ကျန်ပါတယ်`)
: L(`Active until ${new Date(acc.until ?? '').toLocaleDateString()}`, `${new Date(acc.until ?? '').toLocaleDateString()} အထိ`)}
</p>
)}
</div>

{/* birth year for skin age */}
{paid && !acc?.birth_year && (
<label className="block rounded-2xl p-4" style={card}>
<span className="text-[13px] text-[rgb(var(--muted-hover))] block mb-2">{L('Your birth year (to compare your skin age)', 'မွေးနှစ် (အသားအရေ အသက်နဲ့ နှိုင်းယှဉ်ရန်)')}</span>
<select
defaultValue=""
onChange={e => e.target.value && setYear(Number(e.target.value))}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))]"
style={{ background: 'rgb(var(--surface) / 0.6)', border: '1px solid rgb(var(--muted) / 0.2)', fontSize: 16 }}
>
<option value="">{L('Choose', 'ရွေးပါ')}</option>
{Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - 18 - i).map(y => (
<option key={y} value={y}>
{y}
</option>
))}
</select>
</label>
)}

{/* take a photo */}
{camOn && (
<div className="fixed inset-0 z-[60] bg-black flex flex-col">
<div className="relative flex-1 overflow-hidden">
<video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
<div
className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] pointer-events-none"
style={{ width: '62%', aspectRatio: '3 / 4', border: `2px solid ${ROSE}`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
/>
<p className="absolute top-[max(env(safe-area-inset-top),16px)] inset-x-0 text-center text-white text-[13px] px-6 pt-2">
{L('Face in the oval, facing a window. No filter.', 'မျက်နှာကို ဘဲဥပုံထဲထား၊ ပြတင်းပေါက်ဘက် လှည့်ပါ။ Filter မသုံးပါနဲ့။')}
</p>
<button onClick={stopCam} aria-label={L('Close camera', 'ကင်မရာ ပိတ်')} className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] mt-8 rounded-full p-2 bg-black/50 text-white">
<X className="w-5 h-5" />
</button>
</div>
<div className="flex justify-center py-6 pb-[max(env(safe-area-inset-bottom),24px)]">
<button
onClick={snap}
aria-label={L('Take photo', 'ဓာတ်ပုံ ရိုက်')}
className="w-[72px] h-[72px] rounded-full border-4 flex items-center justify-center"
style={{ borderColor: ROSE }}
>
<span className="w-[56px] h-[56px] rounded-full" style={{ background: ROSE }} />
</button>
</div>
</div>
)}

<div className="rounded-2xl p-5" style={card}>
<div className="grid grid-cols-2 gap-2">
<button
type="button"
onClick={openCam}
disabled={status === 'reading' || status === 'ai'}
className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-semibold disabled:opacity-60"
style={{ background: ROSE, color: ROSE_INK }}
>
<Camera className="w-4 h-4" /> {status === 'done' ? L('Scan again', 'ပြန် scan') : L('Take selfie', 'Selfie ရိုက်မယ်')}
</button>
<button
type="button"
onClick={() => galleryRef.current?.click()}
disabled={status === 'reading' || status === 'ai'}
className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-medium disabled:opacity-60"
style={{ border: `1px solid ${ROSE}88`, color: 'rgb(var(--muted-hover))' }}
>
<ImagePlus className="w-4 h-4" /> {L('Upload', 'Upload')}
</button>
</div>
<input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => {
run(e.target.files?.[0]);
e.target.value = '';
}} />
<input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => {
run(e.target.files?.[0]);
e.target.value = '';
}} />
<p className="text-[11px] text-[rgb(var(--muted))] mt-3 leading-relaxed">
{L(
'Daylight from a window, no makeup, no filter or beauty mode, hair off your face. Use the same light every week to compare.',
'ပြတင်းပေါက်က နေ့အလင်း၊ မိတ်ကပ်မပါ၊ filter / beauty mode မသုံး၊ ဆံပင် မျက်နှာပေါ် မကျစေနဲ့။ နှိုင်းယှဉ်ဖို့ အပတ်တိုင်း အလင်းတူတူ သုံးပါ။'
)}
</p>
{(status === 'reading' || status === 'ai') && (
<p className="flex items-center gap-2 text-[13px] mt-3" style={{ color: ROSE }}>
<Loader2 className="w-4 h-4 animate-spin" />
{status === 'reading' ? L('Mapping your skin…', 'အသားအရေ မြေပုံ ဆွဲနေပါတယ်…') : L('Reading your skin in detail…', 'အသေးစိတ် စစ်ဆေးနေပါတယ်…')}
</p>
)}
{error && (
<p className="text-[13px] mt-3" style={{ color: 'rgb(var(--err))' }}>
{error}
</p>
)}
</div>

{/* maps */}
{maps && (
<div className="rounded-2xl p-4 space-y-3" style={card}>
<div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: `${maps.width} / ${maps.height}` }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={maps.overlays[view]}
alt={L(`${N(MAP_NAME[view])} map of your face`, `သင့်မျက်နှာရဲ့ ${N(MAP_NAME[view])} မြေပုံ`)}
className="absolute inset-0 w-full h-full object-cover"
style={!paid && view !== 'spots' ? { filter: 'blur(14px)' } : undefined}
/>
{!paid && view !== 'spots' && (
<button onClick={onGoSkin} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white" style={{ background: 'rgb(0 0 0 / 0.35)' }}>
<Lock className="w-6 h-6" />
<span className="text-sm font-semibold">{L('Unlock all skin maps', 'မြေပုံအားလုံး ဖွင့်ရန်')}</span>
</button>
)}
</div>
<div className="flex gap-2 overflow-x-auto pb-1">
{(['all', ...MAP_KEYS] as (MapKey | 'all')[]).map(k => {
const on = view === k;
const locked = !paid && k !== 'spots';
const col = k === 'all' ? ROSE : `rgb(${MAP_COLORS[k as MapKey].join(',')})`;
return (
<button
key={k}
onClick={() => setView(k)}
className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px]"
style={{
background: on ? 'rgb(var(--muted) / 0.2)' : 'rgb(var(--muted) / 0.08)',
border: `1px solid ${on ? col : 'transparent'}`,
color: 'rgb(var(--muted-hover))',
fontWeight: on ? 600 : 400,
}}
>
<span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
{N(MAP_NAME[k])}
{locked && <Lock className="w-3 h-3" />}
</button>
);
})}
</div>
{/* how much of the face each map covers, and the change since last time */}
<div className="grid grid-cols-2 gap-2">
{MAP_KEYS.map(k => {
const ch = change(k);
const show = paid || k === 'spots';
return (
<div key={k} className="rounded-xl px-3 py-2.5" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<p className="text-[11px] text-[rgb(var(--muted))]">{N(MAP_NAME[k])}</p>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{show ? `${pct(k).toFixed(1)}%` : '•••'}</p>
{show && ch != null && (
<p className="flex items-center gap-1 text-[11px]" style={{ color: ch <= 0 ? '#5BD69A' : 'rgb(var(--err))' }}>
{ch <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
{ch > 0 ? '+' : ''}
{ch}% {L('since last scan', 'ယခင် scan နဲ့စာရင်')}
</p>
)}
</div>
);
})}
</div>
<p className="text-[10px] text-[rgb(var(--muted))] leading-relaxed">
{L(
'% of your face skin each map covers in this photo. Light changes it, so compare scans taken in the same light.',
'ဒီဓာတ်ပုံထဲ မျက်နှာအသားအရေရဲ့ ဘယ်နှ% ကို မြေပုံတစ်ခုချင်း ဖုံးလဲ။ အလင်းကြောင့် ပြောင်းနိုင်လို့ အလင်းတူတူမှာ ရိုက်ပြီး နှိုင်းယှဉ်ပါ။'
)}
</p>
</div>
)}

{/* locked teaser */}
{maps && !paid && (
<div className="rounded-2xl p-5 space-y-3" style={roseCard}>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{L('See your full skin report', 'အသားအရေ report အပြည့်ကို ကြည့်ပါ')}</p>
<ul className="space-y-1.5 text-[13px] text-[rgb(var(--muted-hover))]">
{[
L('Your skin age vs your real age', 'သင့်အသားအရေ အသက် နဲ့ တကယ့်အသက်'),
L('All 4 skin maps, scored by area', 'အသားအရေ မြေပုံ ၄ ခုလုံး၊ နေရာအလိုက် အမှတ်'),
L('Your skin in 10 years: with and without care', '၁၀ နှစ်နောက် သင့်အသားအရေ: ဂရုစိုက်ရင် နဲ့ မစိုက်ရင်'),
L('Your morning and night routine, with products', 'မနက်နဲ့ ည routine၊ ပစ္စည်းများနဲ့'),
L('Weekly progress on the same maps', 'မြေပုံတူတူပေါ်မှာ အပတ်စဉ် တိုးတက်မှု'),
].map(x => (
<li key={x} className="flex gap-2">
<Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: ROSE }} /> {x}
</li>
))}
</ul>
<button onClick={onGoSkin} className="w-full font-semibold py-3.5 rounded-xl text-sm" style={{ background: ROSE, color: ROSE_INK }}>
{isGuest
? L('Save your account to unlock', 'ဖွင့်ရန် အကောင့် သိမ်းပါ')
: L(`Get my full report · from ${fmtMMK(planMmk('skin_report'))}`, `Report အပြည့် ရယူရန် · ${fmtMMK(planMmk('skin_report'))} မှ`)}
</button>
</div>
)}

{/* the AI report */}
{report && (
<>
<div className="rounded-2xl p-5" style={roseCard}>
<div className="grid grid-cols-2 gap-4 text-center">
<div>
<p className="text-[11px] text-[rgb(var(--muted))] uppercase tracking-wide">{L('Skin score', 'အသားအရေ အမှတ်')}</p>
<p className="font-display text-4xl font-semibold text-[rgb(var(--gold))]">{report.score.toFixed(1)}</p>
</div>
<div>
<p className="text-[11px] text-[rgb(var(--muted))] uppercase tracking-wide">{L('Skin age', 'အသားအရေ အသက်')}</p>
<p className="font-display text-4xl font-semibold text-[rgb(var(--gold))]">{report.skin_age}</p>
{age != null && (
<p className="text-[11px]" style={{ color: report.skin_age <= age ? '#5BD69A' : ROSE }}>
{report.skin_age < age
? L(`${age - report.skin_age} years younger than you`, `သင့်အသက်ထက် ${age - report.skin_age} နှစ် ငယ်`)
: report.skin_age > age
? L(`${report.skin_age - age} years older than you`, `သင့်အသက်ထက် ${report.skin_age - age} နှစ် ကြီး`)
: L('Same as your age', 'သင့်အသက်နဲ့ တူ')}
</p>
)}
</div>
</div>
{prev?.score != null && (
<p className="text-center text-[11px] text-[rgb(var(--muted))] mt-3">
{L('Last time', 'ယခင်')}: {Number(prev.score).toFixed(1)} · {new Date(prev.created_at).toLocaleDateString()}
</p>
)}
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-relaxed mt-4">{lang === 'my' && report.summary_my ? report.summary_my : report.summary_en}</p>
</div>

{concerns.length > 0 && (
<div className="rounded-2xl p-5 space-y-3.5" style={card}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{L('What we found', 'တွေ့ရှိချက်များ')}</span>
{concerns.map(c => (
<div key={c.key}>
<div className="flex justify-between text-[13px] mb-1">
<span className="text-[rgb(var(--muted-hover))]">{N(CONCERN_NAME[c.key] ?? [c.key, c.key])}</span>
<span style={{ color: c.severity >= 6 ? ROSE : 'rgb(var(--gold))' }}>
{c.severity >= 7 ? L('Strong', 'များ') : c.severity >= 4 ? L('Medium', 'အလယ်အလတ်') : L('Mild', 'နည်း')}
</span>
</div>
<div className="h-1.5 rounded-full" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-1.5 rounded-full" style={{ width: `${c.severity * 10}%`, background: c.severity >= 6 ? ROSE : 'rgb(var(--gold))' }} />
</div>
{c.zones.length > 0 && <p className="text-[11px] text-[rgb(var(--muted))] mt-1">{c.zones.map(z => N(ZONE_NAME[z] ?? [z, z])).join(', ')}</p>}
</div>
))}
</div>
)}

{/* routine */}
{(report.am.length > 0 || report.pm.length > 0) && (
<div className="rounded-2xl p-5 space-y-4" style={card}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{L('Your routine', 'သင့် routine')}</span>
{(
[
['am', report.am, Sun, L('Morning', 'မနက်')],
['pm', report.pm, Moon, L('Night', 'ည')],
] as const
).map(([k, steps, Icon, title]) =>
steps.length ? (
<div key={k}>
<p className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--gold))] mb-2">
<Icon className="w-4 h-4" /> {title}
</p>
<ol className="space-y-2">
{steps.map((s, i) => (
<li key={i} className="flex gap-3">
<span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold" style={{ background: `${ROSE}33`, color: ROSE }}>
{i + 1}
</span>
<span>
<span className="block text-[13px] text-[rgb(var(--muted-hover))]">{lang === 'my' && s.my ? s.my : s.en}</span>
<span className="block text-[11px] text-[rgb(var(--muted))]">{lang === 'my' && s.why_my ? s.why_my : s.why_en}</span>
</span>
</li>
))}
</ol>
</div>
) : null
)}
<p className="text-[10px] text-[rgb(var(--muted))]">
{L('Cosmetic guidance only, not medical advice. For strong acne or melasma, see a dermatologist.', 'အလှအပ အကြံပြုချက်သာ ဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာ အကြံဉာဏ် မဟုတ်ပါ။ ဝက်ခြံ / အမည်းကွက် များရင် အရေပြားဆရာဝန်နဲ့ ပြပါ။')}
</p>
</div>
)}

{pickScan && <ScanPicks scan={pickScan} />}
</>
)}

{/* your skin in 10 years */}
{maps && (
<div className="rounded-2xl p-5 space-y-3" style={roseCard}>
<div className="flex items-center gap-2">
<Clock className="w-4 h-4" style={{ color: ROSE }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('Your skin in 10 years', '၁၀ နှစ်နောက် သင့်အသားအရေ')}</span>
</div>
{aging ? (
<>
<div className="grid grid-cols-2 gap-2">
{(
[
[aging.noCare, L('Without care', 'ဂရုမစိုက်ရင်')],
[aging.withCare, L('With a routine', 'Routine နဲ့ဆိုရင်')],
] as const
).map(([src, label]) => (
<figure key={label} className="space-y-1.5">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={src} alt={label} className="w-full rounded-xl object-cover" style={{ aspectRatio: '3 / 4' }} />
<figcaption className="text-center text-[12px] text-[rgb(var(--muted-hover))]">{label}</figcaption>
</figure>
))}
</div>
<p className="text-[10px] text-[rgb(var(--muted))]">{L('An AI illustration to show the difference care makes, not a medical prediction.', 'ဂရုစိုက်မှုရဲ့ ကွာခြားချက်ကို ပြတဲ့ AI ပုံသာ ဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာ ခန့်မှန်းချက် မဟုတ်ပါ။')}</p>
</>
) : paid ? (
<>
<p className="text-[12px] text-[rgb(var(--muted-hover))]">{L('See how your skin could look in 10 years without care, and with a good routine.', '၁၀ နှစ်နောက် ဂရုမစိုက်ရင် နဲ့ routine ကောင်းကောင်းနဲ့ဆိုရင် သင့်အသားအရေ ဘယ်လိုဖြစ်မလဲ ကြည့်ပါ။')}</p>
<button onClick={runAging} disabled={agingBusy} className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm disabled:opacity-60" style={{ background: ROSE, color: ROSE_INK }}>
{agingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
{agingBusy ? L('Creating… about 30 seconds', 'ဖန်တီးနေပါတယ်… စက္ကန့် ၃၀ ခန့်') : L('Show my skin in 10 years', '၁၀ နှစ်နောက် အသားအရေ ပြပါ')}
</button>
{agingErr && <p className="text-[12px]" style={{ color: 'rgb(var(--err))' }}>{agingErr}</p>}
<p className="text-[10px] text-[rgb(var(--muted))]">{L('Your photo is sent to Google’s AI to make this and is not stored by Potentia.', 'ဒီပုံဖန်တီးဖို့ သင့်ဓာတ်ပုံကို Google AI ဆီ ပို့ပါတယ်။ Potentia က မသိမ်းပါ။')}</p>
</>
) : (
<button onClick={onGoSkin} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-medium" style={{ border: `1px solid ${ROSE}88`, color: ROSE }}>
<Lock className="w-4 h-4" /> {L('Included in Potentia Skin', 'Potentia Skin မှာ ပါဝင်ပါတယ်')}
</button>
)}
</div>
)}
</div>
);
}

