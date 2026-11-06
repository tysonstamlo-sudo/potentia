'use client';

// app/components/MorphCard.tsx — "Your best version": AI glow-up of the user's own scan photo.
// Paid Premium only. Free and trial users see their own photo blurred with a lock (no AI cost).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLang } from '../../lib/i18n';
import { toAiImage, callAi, aiErrorText } from '../../lib/aiClient';
import { Sparkles, Lock, Loader2, Download, Share2, RefreshCw, Crown } from 'lucide-react';

const CONSENT_KEY = 'ptn_morph_ok';
const STEPS = ['Reading your face...', 'Clearing skin...', 'Leaning out the jawline...', 'Styling hair and brows...', 'Final touches...'];

function Compare({ before, after }: { before: string; after: string }) {
const { t } = useLang();
const [pos, setPos] = useState(50);
const box = useRef<HTMLDivElement | null>(null);
const dragging = useRef(false);
const move = (clientX: number) => {
const r = box.current?.getBoundingClientRect();
if (!r) return;
setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
};
// small intro sweep so people understand they can drag
useEffect(() => {
let x = 50;
let dir = 1;
let steps = 0;
const id = setInterval(() => {
x += dir * 2.5;
if (x >= 72 || x <= 28) dir *= -1;
setPos(x);
if (++steps > 40) {
clearInterval(id);
setPos(50);
}
}, 22);
return () => clearInterval(id);
}, [after]);

return (
<div
ref={box}
className="relative w-full rounded-2xl overflow-hidden select-none touch-none"
style={{ aspectRatio: '3 / 4', background: '#000' }}
onPointerDown={e => {
dragging.current = true;
(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
move(e.clientX);
}}
onPointerMove={e => dragging.current && move(e.clientX)}
onPointerUp={() => (dragging.current = false)}
onPointerCancel={() => (dragging.current = false)}
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={after} alt="Your best version" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
<div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={before} alt="Now" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
</div>
<div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${pos}%`, background: '#fff', boxShadow: '0 0 12px rgb(var(--gold))' }}>
<div
className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold"
style={{ background: '#fff', color: '#000', boxShadow: '0 0 18px rgb(var(--gold))' }}
>
⇆
</div>
</div>
<span className="absolute bottom-3 left-3 text-[10px] font-semibold tracking-[0.15em] uppercase rounded-lg px-2.5 py-1" style={{ background: 'rgb(0 0 0 / 0.6)', color: '#fff' }}>
{t('Now')}
</span>
<span className="absolute bottom-3 right-3 text-[10px] font-semibold tracking-[0.15em] uppercase rounded-lg px-2.5 py-1" style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}>
{t('Your potential')}
</span>
</div>
);
}

export default function MorphCard({
photo,
gender,
canMorph,
onTrial,
onGoPremium,
}: {
photo: string | null;
gender: 'male' | 'female';
canMorph: boolean; // paid Premium
onTrial: boolean;
onGoPremium: () => void;
}) {
const { t, lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [state, setState] = useState<'idle' | 'consent' | 'loading' | 'done' | 'error'>('idle');
const [result, setResult] = useState<string | null>(null);
const [before, setBefore] = useState<string | null>(null);
const [error, setError] = useState('');
const [left, setLeft] = useState<number | null>(null);
const [step, setStep] = useState(0);

useEffect(() => {
if (state !== 'loading') return;
setStep(0);
const id = setInterval(() => setStep(s => Math.min(STEPS.length - 1, s + 1)), 3500);
return () => clearInterval(id);
}, [state]);

if (!photo) return null;

const cardStyle: CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.14), rgb(var(--surface) / 0.5))',
border: '1px solid rgb(var(--gold) / 0.4)',
boxShadow: '0 0 30px rgb(var(--gold) / 0.12)',
};
const primaryBtn: CSSProperties = { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', boxShadow: '0 0 22px rgb(var(--gold) / 0.35)' };

const run = async () => {
let ok = false;
try {
ok = localStorage.getItem(CONSENT_KEY) === '1';
} catch {
/* ignore */
}
if (!ok) return setState('consent');
setState('loading');
setError('');
try {
const img = await toAiImage(photo, 1024, 0.9);
setBefore(img);
const r = await callAi<{ image: string; left: number }>('/api/ai/morph', { image: img, gender });
if (!r.ok) {
setError(r.code === 'limit' ? t("You've used today's {n} morphs. Try again tomorrow.", { n: r.perDay ?? 5 }) : t(aiErrorText(r.code)));
setState('error');
return;
}
setResult(r.data.image);
setLeft(r.data.left);
setState('done');
} catch {
setError(t(aiErrorText('error')));
setState('error');
}
};

const save = () => {
if (!result) return;
const a = document.createElement('a');
a.href = result;
a.download = 'potentia-best-version.png';
a.click();
};

const share = async () => {
if (!result) return;
try {
const blob = await (await fetch(result)).blob();
const file = new File([blob], 'potentia-best-version.png', { type: blob.type || 'image/png' });
const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
if (nav.canShare && nav.canShare({ files: [file] })) await nav.share({ files: [file], title: 'Potentia', text: `My potential 👀 ${window.location.origin}` });
else save();
} catch {
/* closed */
}
};

/* ---------- locked (free + trial) ---------- */
if (!canMorph) {
return (
<div className="rounded-3xl p-5" style={cardStyle}>
<div className="flex items-center gap-2 mb-3">
<Sparkles className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.25em] text-[rgb(var(--gold))] uppercase font-semibold">{t('Your best version')}</span>
</div>
<div className="relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '3 / 4' }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: 'blur(22px) brightness(1.15) saturate(1.2)' }} />
<div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgb(var(--gold) / 0.35), transparent 65%)' }} />
<div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
<span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgb(0 0 0 / 0.55)', border: '1px solid rgb(var(--gold) / 0.6)' }}>
<Lock className="w-6 h-6 text-[rgb(var(--gold))]" />
</span>
<p className="font-display text-xl font-bold text-white" style={{ textShadow: '0 2px 12px rgb(0 0 0 / 0.6)' }}>
{t('See yourself at your peak')}
</p>
<p className="text-xs text-white/85 mt-1.5 max-w-[240px]" style={{ textShadow: '0 1px 8px rgb(0 0 0 / 0.6)' }}>
{L('See yourself fully looksmaxxed: lean, sharp jaw, clear skin, styled hair.', 'အပြည့်အဝ looksmax လုပ်ထားတဲ့ သင့်ကိုယ်သင် ကြည့်ပါ: ပိန်သွယ်၊ မေးရိုးထင်ရှား၊ အသားအရေကြည်၊ ဆံပင်လှ။')}
</p>
</div>
</div>
<button onClick={onGoPremium} className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px]" style={primaryBtn}>
<Crown className="w-4 h-4" /> {onTrial ? t('Unlock with paid Premium') : t('Unlock my best version')}
</button>
{onTrial && <p className="text-[11px] text-[rgb(var(--muted))] text-center mt-2">{t('The morph is for paid Premium members. Your trial includes everything else.')}</p>}
</div>
);
}

/* ---------- paid ---------- */
return (
<div className="rounded-3xl p-5" style={cardStyle}>
<div className="flex items-center justify-between mb-3">
<span className="flex items-center gap-2">
<Sparkles className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.25em] text-[rgb(var(--gold))] uppercase font-semibold">{t('Your best version')}</span>
</span>
{left !== null && <span className="text-[10px] text-[rgb(var(--muted))]">{t('{n} left today', { n: left })}</span>}
</div>

{state === 'done' && result && before ? (
<>
<Compare before={before} after={result} />
<p className="text-[11px] text-[rgb(var(--muted))] text-center mt-2">{t('Drag to compare')}</p>
<div className="grid grid-cols-3 gap-2 mt-4">
<button onClick={share} className="flex flex-col items-center gap-1 rounded-xl py-3 text-[11px] font-semibold" style={primaryBtn}>
<Share2 className="w-4 h-4" /> {t('Share')}
</button>
<button onClick={save} className="flex flex-col items-center gap-1 rounded-xl py-3 text-[11px]" style={{ background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }}>
<Download className="w-4 h-4" /> {t('Save')}
</button>
<button onClick={run} className="flex flex-col items-center gap-1 rounded-xl py-3 text-[11px]" style={{ background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }}>
<RefreshCw className="w-4 h-4" /> {t('Again')}
</button>
</div>
</>
) : state === 'loading' ? (
<div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={before ?? photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
<div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgb(0 0 0 / 0.2), rgb(0 0 0 / 0.65))' }} />
<div className="absolute left-0 right-0 h-1 morph-scan" style={{ background: 'rgb(var(--gold))', boxShadow: '0 0 24px 6px rgb(var(--gold))' }} />
<style>{`@keyframes morphScan{0%{top:0}50%{top:calc(100% - 4px)}100%{top:0}} .morph-scan{animation:morphScan 2.4s ease-in-out infinite}`}</style>
<div className="absolute inset-x-0 bottom-6 text-center">
<Loader2 className="w-6 h-6 animate-spin text-white mx-auto mb-2" />
<p className="text-sm text-white font-medium">{t(STEPS[step])}</p>
<p className="text-[11px] text-white/70 mt-1">{t('This takes about 15 seconds')}</p>
</div>
</div>
) : state === 'consent' ? (
<div className="rounded-2xl p-4" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<p className="text-sm text-[rgb(var(--gold))] font-semibold mb-2">{t('Before we start')}</p>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-4">
{L('To make your best version, your scan photo is sent to Google’s AI. Potentia does not store it. The result is an AI picture of your peak potential, not a promise of results.', 'သင့်အကောင်းဆုံးပုံစံ ဖန်တီးဖို့ စကင်န်ပုံကို Google AI ဆီ ပို့ပါတယ်။ Potentia က မသိမ်းပါ။ ရလဒ်က သင့်အမြင့်ဆုံး အလားအလာကို ပြတဲ့ AI ပုံသာဖြစ်ပြီး ရလဒ်အာမခံချက် မဟုတ်ပါ။')}
</p>
<button
onClick={() => {
try {
localStorage.setItem(CONSENT_KEY, '1');
} catch {
/* ignore */
}
run();
}}
className="w-full font-semibold py-3.5 rounded-xl text-sm"
style={primaryBtn}
>
{t('I agree, show me')}
</button>
<button onClick={() => setState('idle')} className="w-full text-xs text-[rgb(var(--muted))] py-3">
{t('Not now')}
</button>
</div>
) : (
<>
<div className="relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '3 / 4' }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
<div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgb(0 0 0 / 0.7))' }} />
<p className="absolute bottom-4 inset-x-4 text-center text-white text-sm font-medium">
{L('See what you could look like at your absolute peak.', 'သင့်အမြင့်ဆုံး အခြေအနေမှာ ဘယ်လိုပုံပေါက်မလဲ ကြည့်ပါ။')}
</p>
</div>
{error && <p className="text-xs text-[rgb(var(--err))] mb-3">{error}</p>}
<button onClick={run} className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px]" style={primaryBtn}>
<Sparkles className="w-4 h-4" /> {t('Show my best version')}
</button>
</>
)}
<p className="text-[10px] text-[rgb(var(--muted))] text-center mt-3 leading-relaxed">
{L('AI picture of your max potential. Some changes take years of work or can’t be reached naturally. Not a guarantee.', 'သင့်အမြင့်ဆုံး အလားအလာကို ပြတဲ့ AI ပုံ။ တချို့အပြောင်းအလဲတွေက နှစ်ချီကြာနိုင်ပြီး သဘာဝအတိုင်း မရောက်နိုင်တာလည်း ရှိပါတယ်။ အာမခံချက် မဟုတ်ပါ။')}
</p>
</div>
);
}

