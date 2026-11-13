'use client';

// app/components/ProgressGallery.tsx — your scan photos over time + before/after compare.
// Photos live only on this phone.

import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../../lib/i18n';
import { Sheet } from './shopShared';
import { listPhotos, deletePhoto, type GalleryPhoto } from '../../lib/gallery';
import { Trash2, ImageIcon, ArrowLeftRight } from 'lucide-react';

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

export default function ProgressGallery({ onClose }: { onClose: () => void }) {
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
{photos === null ? null : photos.length === 0 ? (
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

