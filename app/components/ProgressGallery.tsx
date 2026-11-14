'use client';

// app/components/ProgressGallery.tsx — your scan photos over time + before/after compare.
// Photos live only on this phone.
// `locked` = the person's plan does not include the gallery (free, 24-Hour Pass, 1 Week): they see what is inside
// and an upgrade button, but not the photos.

import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { Sheet } from './shopShared';
import { listPhotos, deletePhoto, type GalleryPhoto } from '../../lib/gallery';
import { fmtMMK, planMmk } from '../../lib/payments';
import { Trash2, ImageIcon, ArrowLeftRight, Lock, Crown, Check } from 'lucide-react';

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function Compare({ before, after }: { before: GalleryPhoto; after: GalleryPhoto }) {
const [pos, setPos] = useState(50);
const box = useRef<HTMLDivElement | null>(null);
const move = (clientX: number) => {
const r = box.current?.getBoundingClientRect();
if (!r) return;
setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
};
const diff = Math.round((after.score - before.score) * 10) / 10;
return (
<div>
<div
ref={box}
className="relative w-full aspect-square rounded-2xl overflow-hidden select-none touch-none"
style={{ border: '1px solid rgb(var(--gold) / 0.35)' }}
onPointerDown={e => {
(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
move(e.clientX);
}}
onPointerMove={e => e.buttons && move(e.clientX)}
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={after.face} alt="" className="absolute inset-0 w-full h-full object-cover" />
<div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={before.face} alt="" className="absolute inset-0 h-full object-cover" style={{ width: box.current?.offsetWidth ?? '100%', maxWidth: 'none' }} />
</div>
<div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${pos}%`, background: 'rgb(var(--gold))', boxShadow: '0 0 10px rgb(var(--gold))' }} />
<span className="absolute top-3 left-3 text-[10px] font-semibold rounded-full px-2 py-1" style={{ background: 'rgb(0 0 0 / 0.6)', color: '#fff' }}>
{fmtDate(before.at)}
</span>
<span className="absolute top-3 right-3 text-[10px] font-semibold rounded-full px-2 py-1" style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}>
{fmtDate(after.at)}
</span>
</div>
<p className="text-center text-xs mt-2 text-[rgb(var(--muted-hover))]">
{before.score.toFixed(1)} → {after.score.toFixed(1)}{' '}
<span style={{ color: diff > 0 ? 'rgb(var(--gold))' : diff < 0 ? 'rgb(var(--err))' : 'rgb(var(--muted))' }}>
({diff > 0 ? '+' : ''}
{diff.toFixed(1)})
</span>
</p>
</div>
);
}

export default function ProgressGallery({ onClose, locked = false, onUpgrade }: { onClose: () => void; locked?: boolean; onUpgrade?: () => void }) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
const [pick, setPick] = useState<string[]>([]); // up to 2 ids to compare

useEffect(() => {
listPhotos().then(p => {
setPhotos(p);
if (p.length >= 2) setPick([p[p.length - 1].id, p[0].id]); // first vs latest
});
}, []);

const toggle = (id: string) =>
setPick(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(-2)));

const remove = async (id: string) => {
if (!confirm(L('Delete this photo from your phone?', 'ဒီဓာတ်ပုံကို ဖုန်းထဲက ဖျက်မလား?'))) return;
await deletePhoto(id);
setPhotos(p => (p ?? []).filter(x => x.id !== id));
setPick(cur => cur.filter(x => x !== id));
};

const chosen = (photos ?? []).filter(p => pick.includes(p.id)).sort((a, b) => a.at - b.at);

return (
<Sheet onClose={onClose} title={L('Progress photos', 'တိုးတက်မှု ဓာတ်ပုံများ')}>
<div className="space-y-5 font-body">
{locked ? (
<div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.12), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.35)' }}>
<span className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgb(var(--gold) / 0.15)' }}>
<Lock className="w-5 h-5 text-[rgb(var(--gold))]" />
</span>
<h3 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-1">
{L('Progress photos are in Silver and up', 'တိုးတက်မှု ဓာတ်ပုံတွေက Silver နှင့်အထက် plan မှာ ပါပါတယ်')}
</h3>
{photos && photos.length > 0 && (
<>
<p className="text-xs text-[rgb(var(--muted-hover))] mb-3">
{L(
`You already have ${photos.length} photo(s) saved on this phone. Upgrade to see them.`,
`ဒီဖုန်းထဲမှာ ဓာတ်ပုံ ${photos.length} ပုံ သိမ်းထားပြီးသားပါ။ ကြည့်ဖို့ upgrade လုပ်ပါ။`
)}
</p>
<div className="flex justify-center gap-2 mb-4" aria-hidden>
{photos.slice(0, 3).map(p => (
<div key={p.id} className="w-20 h-20 rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--gold) / 0.3)' }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={p.face} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(9px)', transform: 'scale(1.2)' }} />
</div>
))}
</div>
</>
)}
<ul className="text-left space-y-2 mb-5 mt-4">
{[
L('A photo saved from every camera scan, with the date and score', 'Camera scan တိုင်းက ဓာတ်ပုံကို ရက်စွဲ၊ အမှတ်နဲ့ သိမ်းပေးခြင်း'),
L('Before / after slider to compare any two photos', 'ဓာတ်ပုံ ၂ ပုံကို before / after ဆွဲကြည့်နိုင်ခြင်း'),
L('See exactly how much your score moved', 'အမှတ် ဘယ်လောက် ပြောင်းလဲ ကြည့်နိုင်ခြင်း'),
L('Your last photo shown faintly over the camera, so every photo lines up', 'နောက်ဆုံးပုံကို ကင်မရာပေါ် မှိန်မှိန်ပြပေးလို့ ပုံတိုင်း တန်းညှိနိုင်ခြင်း'),
].map(line => (
<li key={line} className="flex items-start gap-2 text-[13px] text-[rgb(var(--muted-hover))] leading-snug">
<Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[rgb(var(--gold))]" /> {line}
</li>
))}
</ul>
<button
onClick={onUpgrade}
className="w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-xl text-[13px]"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Crown className="w-4 h-4" /> {L(`Upgrade to Silver · ${fmtMMK(planMmk('1month'))}`, `Silver plan သို့ upgrade · ${fmtMMK(planMmk('1month'))}`)}
</button>
</div>
) : photos === null ? null : photos.length === 0 ? (
<div className="rounded-2xl p-8 text-center" style={{ background: 'rgb(var(--surface) / 0.5)', border: '1px solid rgb(var(--muted) / 0.14)' }}>
<ImageIcon className="w-8 h-8 mx-auto mb-3 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">
{L(
'Every camera scan saves a photo here. Scan once a week and watch your glow-up.',
'Camera scan တိုင်း ဒီမှာ ဓာတ်ပုံ သိမ်းပေးပါတယ်။ တစ်ပတ်တစ်ခါ scan လုပ်ပြီး သင့်ပြောင်းလဲမှုကို ကြည့်ပါ။'
)}
</p>
</div>
) : (
<>
{chosen.length === 2 ? (
<Compare before={chosen[0]} after={chosen[1]} />
) : (
<div className="rounded-2xl p-4 text-center text-xs text-[rgb(var(--muted-hover))]" style={{ background: 'rgb(var(--gold) / 0.08)', border: '1px dashed rgb(var(--gold) / 0.4)' }}>
<ArrowLeftRight className="w-4 h-4 mx-auto mb-1 text-[rgb(var(--gold))]" />
{L('Tap two photos to compare them.', 'နှိုင်းယှဉ်ရန် ဓာတ်ပုံ ၂ ပုံကို နှိပ်ပါ။')}
</div>
)}

<div className="grid grid-cols-3 gap-2">
{photos.map(p => {
const on = pick.includes(p.id);
return (
<div key={p.id} className="relative">
<button
onClick={() => toggle(p.id)}
className="block w-full aspect-square rounded-xl overflow-hidden"
style={{ border: `2px solid ${on ? 'rgb(var(--gold))' : 'transparent'}`, boxShadow: on ? '0 0 12px rgb(var(--gold) / 0.5)' : 'none' }}
>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={p.face} alt="" className="w-full h-full object-cover" />
</button>
<div className="flex items-center justify-between mt-1 px-0.5">
<span className="text-[10px] text-[rgb(var(--muted))]">{fmtDate(p.at)}</span>
<span className="text-[10px] font-semibold text-[rgb(var(--gold))]">{p.score.toFixed(1)}</span>
</div>
<button
onClick={() => remove(p.id)}
className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
style={{ background: 'rgb(0 0 0 / 0.55)', color: '#fff' }}
aria-label="Delete"
>
<Trash2 className="w-3 h-3" />
</button>
</div>
);
})}
</div>
</>
)}
<p className="text-center text-[10px] text-[rgb(var(--muted))]">
{L('These photos are saved only on this phone. They are never uploaded.', 'ဒီဓာတ်ပုံတွေကို ဒီဖုန်းထဲမှာပဲ သိမ်းထားပါတယ်။ ဘယ်တော့မှ upload မလုပ်ပါ။')}
</p>
</div>
</Sheet>
);
}

