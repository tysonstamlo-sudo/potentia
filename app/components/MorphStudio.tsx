'use client';

// app/components/MorphStudio.tsx — the Morph tab: "your best version" from your last scan photo,
// a new selfie, or a photo from your gallery. Silver, Gold and Platinum make the morph; others see the locked preview.

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { lastPhoto } from '../../lib/gallery';
import MorphCard from './MorphCard';
import { Camera, ImagePlus, History, Wand2 } from 'lucide-react';

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

/** Read a picked file as a data URL, shrunk so it never overloads the phone (max 1400 px). */
function readPhoto(file: File): Promise<string> {
return new Promise((resolve, reject) => {
const url = URL.createObjectURL(file);
const img = new Image();
img.onload = () => {
const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
const c = document.createElement('canvas');
c.width = Math.round(img.width * scale);
c.height = Math.round(img.height * scale);
c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
URL.revokeObjectURL(url);
resolve(c.toDataURL('image/jpeg', 0.9));
};
img.onerror = () => {
URL.revokeObjectURL(url);
reject(new Error('Could not read the photo'));
};
img.src = url;
});
}

export default function MorphStudio({ canMorph, onTrial, onGoPremium }: { canMorph: boolean; onTrial: boolean; onGoPremium: () => void }) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [gender, setGender] = useState<'male' | 'female'>('male');
const [lastScan, setLastScan] = useState<string | null>(null);
const [photo, setPhoto] = useState<string | null>(null);
const [error, setError] = useState('');
const selfieRef = useRef<HTMLInputElement | null>(null);
const galleryRef = useRef<HTMLInputElement | null>(null);

useEffect(() => {
let alive = true;
lastPhoto().then(p => {
if (!alive || !p) return;
setLastScan(p.face);
setPhoto(cur => cur ?? p.face);
});
supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
if (!session) return;
const { data } = await supabase.from('profiles').select('gender').eq('id', session.user.id).single();
if (alive && (data?.gender === 'male' || data?.gender === 'female')) setGender(data.gender);
});
return () => {
alive = false;
};
}, []);

const pick = async (file: File | undefined) => {
if (!file) return;
setError('');
try {
setPhoto(await readPhoto(file));
} catch {
setError(L('That photo could not be opened. Try another one.', 'ဒီဓာတ်ပုံကို ဖွင့်လို့ မရပါ။ တခြားတစ်ပုံ စမ်းပါ။'));
}
};

const source = (active: boolean): React.CSSProperties => ({
background: active ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--surface) / 0.5)',
border: `1px solid ${active ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.18)'}`,
color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))',
});

return (
<div className="space-y-5 font-body max-w-xl mx-auto">
<div className="p-5 rounded-2xl" style={cardStyle}>
<div className="flex items-center gap-2 mb-1.5">
<Wand2 className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase">{L('AI morph', 'AI morph')}</span>
</div>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{L('Your best version', 'သင့်အကောင်းဆုံးပုံစံ')}</h2>
<p className="text-xs text-[rgb(var(--muted-hover))] mt-2 leading-relaxed">
{L(
'See yourself at your peak: leaner face, sharper jaw, hunter eyes, stronger brows and clear skin. Still you.',
'သင့်အမြင့်ဆုံးအခြေအနေကို ကြည့်ပါ: မျက်နှာ ပိုသွယ်၊ မေးရိုး ပိုထက်၊ hunter eyes၊ မျက်ခုံး ပိုထူ၊ အသားအရေ ကြည်လင်။ သင်ကိုယ်တိုင်ပါပဲ။'
)}
</p>

<div className="grid grid-cols-3 gap-2 mt-4">
<button
type="button"
disabled={!lastScan}
onClick={() => lastScan && setPhoto(lastScan)}
className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-medium disabled:opacity-40"
style={source(!!lastScan && photo === lastScan)}
>
<History className="w-4 h-4" /> {L('Last scan', 'နောက်ဆုံး scan')}
</button>
<button type="button" onClick={() => selfieRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-medium" style={source(false)}>
<Camera className="w-4 h-4" /> {L('Take selfie', 'Selfie ရိုက်မယ်')}
</button>
<button type="button" onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-medium" style={source(false)}>
<ImagePlus className="w-4 h-4" /> {L('Upload', 'Upload')}
</button>
</div>
<input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => pick(e.target.files?.[0])} />
<input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
<p className="text-[10px] text-[rgb(var(--muted))] mt-3 leading-relaxed">
{L(
'Best results: face the camera, neutral face, good even light, hair off your forehead.',
'အကောင်းဆုံးရလဒ်အတွက်: ကင်မရာကို တည့်တည့်ကြည့်၊ မျက်နှာ ပုံမှန်ထား၊ အလင်းညီညီ၊ ဆံပင်ကို နဖူးပေါ် မကျစေနဲ့။'
)}
</p>
{error && (
<p className="text-xs mt-2" style={{ color: 'rgb(var(--err))' }}>
{error}
</p>
)}
</div>

{photo ? (
<MorphCard key={photo.slice(-64)} photo={photo} gender={gender} canMorph={canMorph} onTrial={onTrial} onGoPremium={onGoPremium} />
) : (
<div className="rounded-2xl p-8 text-center text-sm text-[rgb(var(--muted-hover))]" style={cardStyle}>
{L('Take a selfie or upload a photo to start.', 'စတင်ဖို့ selfie ရိုက်ပါ (သို့) ဓာတ်ပုံ upload လုပ်ပါ။')}
</div>
)}
</div>
);
}

