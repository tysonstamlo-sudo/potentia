'use client';

// app/components/SkinExtras.tsx — the parts of Potentia Skin made for women in Myanmar:
// SkinPrefs — mom mode (pregnancy-safe), budget routine, morning sun alert + city
// ShopRoutine — her routine built from real Shop products, with the total price
// PigmentTracker — dark patches fading over time + before/after (photos stay on the phone)
// GlowChallenge — 30 days: tick the routine every day, scan on days 1/7/14/21/30, share the result

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { fmtMMK, planMmk } from '../../lib/payments';
import { routineFromShop, stepType, type StepType } from '../../lib/recommend';
import { listSkinPhotos, beforeAfter, type SkinPhoto } from '../../lib/skinPhotos';
import { CITIES, CITY_KEYS } from '../../lib/uv';
import { ProductImage, type Product } from './shopShared';
import type { SkinStep, SkinCompare } from '../api/ai/skin/route';
import { Baby, Wallet, Sun, Moon, Check, Flame, Camera, Share2, Trophy, TrendingDown, Sparkles, Lock, ShoppingBag } from 'lucide-react';
import { track } from '../../lib/track';

const ProductSheet = lazy(() => import('./Marketplace').then(m => ({ default: m.ProductSheet })));

const ACC = 'rgb(var(--gold))';
const ACC_INK = 'rgb(var(--bg))';
const GOOD = '#5BD69A';
const card: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};
const accCard: React.CSSProperties = { ...card, border: '1px solid rgb(var(--gold) / 0.4)', background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.45))' };
const DAY = 24 * 3600 * 1000;
const MM = 6.5 * 3600 * 1000; // Myanmar time offset
const mmDate = (ms: number) => new Date(ms + MM).toISOString().slice(0, 10);
export const BUDGET_MMK = 30000;

export type SkinAccess = {
access: 'none' | 'plan' | 'premium' | 'report';
until: string | null;
reports: number;
birth_year: number | null;
mom?: boolean;
budget?: boolean;
uv?: boolean;
city?: string;
challenge_at?: string | null;
};

function useL() {
const { lang } = useLang();
return { lang, L: (en: string, my: string) => (lang === 'my' ? my : en) };
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
return (
<button
type="button"
role="switch"
aria-checked={on}
aria-label={label}
onClick={() => onChange(!on)}
className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
style={{ background: on ? ACC : 'rgb(var(--muted) / 0.3)' }}
>
<span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 22 : 2 }} />
</button>
);
}

/* ====================================================================== */
/* Settings: mom mode, budget, sun alert */
/* ====================================================================== */

export function SkinPrefs({ acc, onChange }: { acc: SkinAccess; onChange: (a: SkinAccess) => void }) {
const { lang, L } = useL();
const [busy, setBusy] = useState(false);
const [notif, setNotif] = useState<string>('granted');
useEffect(() => {
try {
setNotif(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
} catch {}
}, []);

const save = async (next: Partial<SkinAccess>) => {
const merged = { ...acc, ...next };
onChange(merged);
setBusy(true);
const { error } = await supabase.rpc('set_skin_prefs', {
p_mom: !!merged.mom,
p_budget: !!merged.budget,
p_uv: merged.uv !== false,
p_city: merged.city ?? 'yangon',
});
setBusy(false);
if (error) onChange(acc); // put it back
else track('skin_prefs', { mom: !!merged.mom, budget: !!merged.budget, uv: merged.uv !== false });
};

const row = 'flex items-center gap-3 px-4 py-3.5';
const line = { borderTop: '1px solid rgb(var(--muted) / 0.1)' };
return (
<div className="rounded-2xl overflow-hidden" style={{ ...card, opacity: busy ? 0.8 : 1 }}>
<p className="px-4 pt-3.5 text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{L('Made for you', 'သင့်အတွက်')}</p>
<div className={row}>
<Baby className="w-4 h-4 flex-shrink-0" style={{ color: ACC }} />
<span className="flex-1">
<span className="block text-sm text-[rgb(var(--muted-hover))]">{L('Pregnant or breastfeeding', 'ကိုယ်ဝန်ဆောင် / နို့တိုက်မိခင်')}</span>
<span className="block text-[11px] text-[rgb(var(--muted))]">
{L('Your routine and products leave out ingredients that are not safe for you and baby.', 'သင်နဲ့ ကလေးအတွက် မသင့်တဲ့ ပါဝင်ပစ္စည်းတွေကို routine နဲ့ ပစ္စည်းတွေထဲက ဖယ်ပေးပါတယ်။')}
</span>
</span>
<Switch on={!!acc.mom} onChange={v => save({ mom: v })} label={L('Pregnant or breastfeeding', 'ကိုယ်ဝန်ဆောင် / နို့တိုက်မိခင်')} />
</div>
<div className={row} style={line}>
<Wallet className="w-4 h-4 flex-shrink-0" style={{ color: ACC }} />
<span className="flex-1">
<span className="block text-sm text-[rgb(var(--muted-hover))]">{L('Budget routine', 'ချွေတာ routine')}</span>
<span className="block text-[11px] text-[rgb(var(--muted))]">
{L(`3 simple steps, under ${fmtMMK(BUDGET_MMK)} a month.`, `ရိုးရှင်းတဲ့ အဆင့် ၃ ဆင့်၊ တစ်လ ${fmtMMK(BUDGET_MMK)} အောက်။`)}
</span>
</span>
<Switch on={!!acc.budget} onChange={v => save({ budget: v })} label={L('Budget routine', 'ချွေတာ routine')} />
</div>
<div className={row} style={line}>
<Sun className="w-4 h-4 flex-shrink-0" style={{ color: ACC }} />
<span className="flex-1">
<span className="block text-sm text-[rgb(var(--muted-hover))]">{L('Morning sun alert', 'မနက် နေရောင် သတိပေးချက်')}</span>
<span className="block text-[11px] text-[rgb(var(--muted))]">
{L("Today's UV at 7am, so you never skip sunscreen.", 'မနက် ၇ နာရီမှာ ဒီနေ့ UV ကို ပို့ပေးမယ်။ နေကာ မမေ့တော့ဘူး။')}
</span>
</span>
<Switch on={acc.uv !== false} onChange={v => save({ uv: v })} label={L('Morning sun alert', 'မနက် နေရောင် သတိပေးချက်')} />
</div>
{acc.uv !== false && (
<div className="px-4 pb-3.5 -mt-1 space-y-2">
<select
value={acc.city ?? 'yangon'}
onChange={e => save({ city: e.target.value })}
className="w-full rounded-xl px-3 py-2.5 text-[rgb(var(--gold))]"
style={{ background: 'rgb(var(--surface) / 0.6)', border: '1px solid rgb(var(--muted) / 0.2)', fontSize: 16 }}
>
{CITY_KEYS.map(k => (
<option key={k} value={k}>
{lang === 'my' ? CITIES[k].my : CITIES[k].en}
</option>
))}
</select>
{notif !== 'granted' && (
<p className="text-[11px] text-[rgb(var(--muted))]">
{L('Turn on notifications in Settings to get it.', 'ရဖို့ Settings ထဲမှာ notification ဖွင့်ပါ။')}
</p>
)}
</div>
)}
</div>
);
}

/* ====================================================================== */
/* Her routine from the Shop, with the total */
/* ====================================================================== */

const TYPE_NAME: Record<StepType, [string, string]> = {
cleanser: ['Cleanser', 'မျက်နှာသစ်'],
toner: ['Toner', 'Toner'],
serum: ['Serum', 'Serum'],
treatment: ['Treatment', 'ကုသဆေး'],
moisturizer: ['Moisturizer', 'အစိုဓာတ် ခရင်မ်'],
sunscreen: ['Sunscreen', 'နေကာ'],
eye: ['Eye cream', 'မျက်လုံးအောက် ခရင်မ်'],
mask: ['Mask', 'Mask'],
};

export function ShopRoutine({ am, pm, avoid, budget }: { am: SkinStep[]; pm: SkinStep[]; avoid?: string[]; budget?: boolean }) {
const { lang, L } = useL();
const [products, setProducts] = useState<Product[]>([]);
const [uid, setUid] = useState<string | null>(null);
const [open, setOpen] = useState<Product | null>(null);

useEffect(() => {
let alive = true;
(async () => {
const {
data: { session },
} = await supabase.auth.getSession();
const { data } = await supabase.from('products').select('*').eq('active', true).eq('hidden_by_admin', false).limit(300);
if (!alive) return;
setUid(session?.user.id ?? null);
setProducts((data as Product[]) ?? []);
})();
return () => {
alive = false;
};
}, []);

const types = useMemo(() => {
const t: StepType[] = [];
for (const s of [...am, ...pm]) {
const k = s.type ?? stepType(s.en);
if (k && !t.includes(k)) t.push(k);
}
return t;
}, [am, pm]);

const { picks, total } = useMemo(() => routineFromShop(types, products.filter(p => p.seller_id !== uid), avoid), [types, products, uid, avoid]);
const found = picks.filter(p => p.product);
if (found.length < 2) return null;
const missing = picks.filter(p => !p.product);

return (
<div className="rounded-2xl p-5 space-y-3" style={accCard}>
<div className="flex items-center gap-2">
<ShoppingBag className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">
{budget ? L('Your budget routine', 'သင့် ချွေတာ routine') : L('Your routine, ready to buy', 'သင့် routine၊ ဝယ်ဖို့ အဆင်သင့်')}
</span>
</div>
<p className="text-[12px] text-[rgb(var(--muted-hover))]">
{L('The lowest-priced product in the Shop for each step of your routine.', 'သင့် routine အဆင့်တိုင်းအတွက် Shop ထဲက ဈေးအသက်သာဆုံး ပစ္စည်း။')}
</p>
<div className="space-y-2">
{found.map(({ type, product }) => (
<button
key={type}
onClick={() => {
track('pick_open', { where: 'skin_routine', concern: type });
setOpen(product);
}}
className="w-full flex items-center gap-3 rounded-xl p-2 text-left"
style={{ background: 'rgb(var(--muted) / 0.08)' }}
>
<div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
<ProductImage src={product!.image_url} alt={product!.name} className="w-full h-full" />
</div>
<div className="min-w-0 flex-1">
<p className="text-[10px] uppercase tracking-wide" style={{ color: ACC }}>
{lang === 'my' ? TYPE_NAME[type][1] : TYPE_NAME[type][0]}
</p>
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-snug line-clamp-1">{product!.name}</p>
<p className="text-[10px] text-[rgb(var(--muted))] truncate">{product!.shop_name}</p>
</div>
<p className="font-display text-sm font-semibold text-[rgb(var(--gold))] flex-shrink-0">{fmtMMK(product!.price_mmk)}</p>
</button>
))}
</div>
<div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<span className="text-[13px] text-[rgb(var(--muted-hover))]">{L('Total to start', 'စတင်ရန် စုစုပေါင်း')}</span>
<span className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{fmtMMK(total)}</span>
</div>
{budget && (
<p className="text-[12px]" style={{ color: total <= BUDGET_MMK ? GOOD : 'rgb(var(--err))' }}>
{total <= BUDGET_MMK
? L(`✓ Under your ${fmtMMK(BUDGET_MMK)} budget`, `✓ ${fmtMMK(BUDGET_MMK)} ဘတ်ဂျက်အောက်`)
: L(`${fmtMMK(total - BUDGET_MMK)} over budget — start with the cleanser and sunscreen first.`, `ဘတ်ဂျက်ထက် ${fmtMMK(total - BUDGET_MMK)} ကျော်တယ် — မျက်နှာသစ်နဲ့ နေကာကို အရင်စပါ။`)}
</p>
)}
{missing.length > 0 && (
<p className="text-[11px] text-[rgb(var(--muted))]">
{L('Not in the Shop yet', 'Shop မှာ မရှိသေး')}: {missing.map(m => (lang === 'my' ? TYPE_NAME[m.type][1] : TYPE_NAME[m.type][0])).join(', ')}
</p>
)}
{open && (
<Suspense fallback={null}>
<ProductSheet product={open} isMine={false} onClose={() => setOpen(null)} onOrdered={() => {}} />
</Suspense>
)}
</div>
);
}

/* ====================================================================== */
/* Dark patches fading over time */
/* ====================================================================== */

type ScanRow = { created_at: string; score: number | null; skin_age: number | null; maps: Record<string, number> | null; compare: SkinCompare | null };

function Spark({ values, labels }: { values: number[]; labels: string[] }) {
const w = 300, h = 90, pad = 14;
const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
const span = hi - lo || 1;
const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1);
const y = (v: number) => pad + ((hi - v) * (h - 2 * pad)) / span;
const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
return (
<svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full" role="img" aria-label="Dark patch change over time">
<line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="rgb(var(--muted) / 0.3)" strokeDasharray="3 4" />
<polyline points={pts} fill="none" stroke={ACC} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
{values.map((v, i) => (
<g key={i}>
<circle cx={x(i)} cy={y(v)} r={3.5} fill={ACC} />
{(i === 0 || i === values.length - 1) && (
<text x={x(i)} y={y(v) - 8} textAnchor={i === 0 ? 'start' : 'end'} fontSize="11" fill="rgb(var(--muted-hover))">
{v > 0 ? '+' : ''}
{v}%
</text>
)}
{(i === 0 || i === values.length - 1) && (
<text x={x(i)} y={h + 12} textAnchor={i === 0 ? 'start' : 'end'} fontSize="10" fill="rgb(var(--muted))">
{labels[i]}
</text>
)}
</g>
))}
</svg>
);
}

function BeforeAfterPics({ before, after }: { before: SkinPhoto; after: SkinPhoto }) {
const { L } = useL();
const d = (p: SkinPhoto) => new Date(p.at).toLocaleDateString();
return (
<div className="grid grid-cols-2 gap-2">
{[
[before, L('Before', 'အရင်')],
[after, L('Now', 'အခု')],
].map(([p, label]) => (
<figure key={label as string} className="text-center">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={(p as SkinPhoto).img} alt={label as string} className="w-full rounded-xl object-cover" style={{ aspectRatio: '3 / 4' }} />
<figcaption className="text-[11px] text-[rgb(var(--muted))] mt-1">
{label as string} · {d(p as SkinPhoto)}
</figcaption>
</figure>
))}
</div>
);
}

export function PigmentTracker({ uid, refreshKey }: { uid: string; refreshKey: number }) {
const { lang, L } = useL();
const [rows, setRows] = useState<ScanRow[]>([]);
const [pics, setPics] = useState<{ before: SkinPhoto | null; after: SkinPhoto | null }>({ before: null, after: null });

useEffect(() => {
let alive = true;
(async () => {
const { data } = await supabase
.from('skin_scans')
.select('created_at, score, skin_age, maps, compare:report->compare')
.eq('user_id', uid)
.order('created_at', { ascending: true })
.limit(60);
if (!alive) return;
const list = ((data ?? []) as unknown as ScanRow[]).filter(r => r);
setRows(list);
// the before photo is the one the latest comparison used
const last = [...list].reverse().find(r => r.compare);
setPics(await beforeAfter(last?.compare ? last.compare.base_at - 1000 : Date.now() - 120 * DAY));
})();
return () => {
alive = false;
};
}, [uid, refreshKey]);

const latest = [...rows].reverse().find(r => r.compare)?.compare ?? null;
// only join comparisons made against the same before photo
const series = latest ? rows.filter(r => r.compare && r.compare.base_at === latest.base_at) : [];
const values = [0, ...series.map(r => r.compare!.patches)];
const labels = [L('Start', 'စ'), ...series.map(r => new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))];

return (
<div className="rounded-2xl p-5 space-y-3" style={accCard}>
<div className="flex items-center gap-2">
<TrendingDown className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('Dark patches tracker', 'တင်းကွက် စောင့်ကြည့်ခြင်း')}</span>
</div>
{!latest ? (
<p className="text-[12px] text-[rgb(var(--muted-hover))] leading-relaxed">
{L(
'Scan again in a few days in the same light. We put your first photo and the new one side by side and show how much your dark patches and spots faded.',
'ရက်အနည်းငယ်ကြာရင် အလင်းတူတူမှာ ပြန် scan ပါ။ ပထမပုံနဲ့ ပုံအသစ်ကို ဘေးချင်းယှဉ်ပြီး တင်းကွက်နဲ့ အမည်းစက် ဘယ်လောက် ပျော့သွားလဲ ပြပေးမယ်။'
)}
</p>
) : (
<>
<div className="grid grid-cols-2 gap-2">
{(
[
['patches', L('Dark patches', 'တင်းကွက်')],
['spots', L('Dark spots', 'အမည်းစက်')],
] as const
).map(([k, label]) => {
const v = latest[k];
return (
<div key={k} className="rounded-xl px-3 py-2.5" style={{ background: 'rgb(var(--muted) / 0.08)' }}>
<p className="text-[11px] text-[rgb(var(--muted))]">{label}</p>
<p className="font-display text-2xl font-semibold" style={{ color: v < 0 ? GOOD : v > 0 ? 'rgb(var(--err))' : ACC }}>
{v > 0 ? '+' : ''}
{v}%
</p>
<p className="text-[10px] text-[rgb(var(--muted))]">
{v < 0 ? L('lighter', 'ပျော့သွား') : v > 0 ? L('darker', 'ပိုရင့်') : L('no change', 'မပြောင်း')} · {L(`in ${latest.days} days`, `${latest.days} ရက်အတွင်း`)}
</p>
</div>
);
})}
</div>
{(lang === 'my' ? latest.note_my : latest.note_en) && (
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-relaxed">{lang === 'my' ? latest.note_my : latest.note_en}</p>
)}
{!latest.same_light && (
<p className="text-[11px]" style={{ color: '#F5B942' }}>
{L('The light was different from your first photo, so this is a rough guess. Scan by the same window next time.', 'ပထမပုံနဲ့ အလင်းမတူလို့ ခန့်မှန်းချက်သာ ဖြစ်ပါတယ်။ နောက်တစ်ခါ ပြတင်းပေါက်တူတူနားမှာ scan ပါ။')}
</p>
)}
{values.length >= 3 && <Spark values={values} labels={labels} />}
</>
)}
{pics.before && pics.after && <BeforeAfterPics before={pics.before} after={pics.after} />}
<p className="text-[10px] text-[rgb(var(--muted))] leading-relaxed">
{L(
'Photos stay on this phone only. Melasma fades slowly: expect weeks, and daily sunscreen matters most.',
'ဓာတ်ပုံတွေ ဒီဖုန်းထဲမှာပဲ ရှိပါတယ်။ တင်းကွက်က ဖြည်းဖြည်းချင်း ပျော့တာမို့ ရက်သတ္တပတ်တွေ ကြာနိုင်ပြီး နေ့တိုင်း နေကာ လိမ်းတာ အရေးကြီးဆုံးပါ။'
)}
</p>
</div>
);
}

/* ====================================================================== */
/* 30-day Glow Challenge */
/* ====================================================================== */

const SCAN_DAYS = [1, 7, 14, 21, 30];
const LENGTH = 30;

type Checkin = { day: string; am: boolean; pm: boolean };

async function makeShareCard(opts: {
before: string | null;
after: string | null;
lines: [string, string][];
title: string;
dayLabels: [string, string];
footer: string;
}): Promise<Blob | null> {
const W = 1080, H = 1350;
const c = document.createElement('canvas');
c.width = W;
c.height = H;
const x = c.getContext('2d');
if (!x) return null;
const accRaw = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '79 216 255';
const acc = `rgb(${accRaw.split(/\s+/).join(',')})`;
const font = (w: number, s: number) => `${w} ${s}px system-ui, -apple-system, "Myanmar Sangam MN", "Noto Sans Myanmar", "Padauk", sans-serif`;

// background
x.fillStyle = '#07080a';
x.fillRect(0, 0, W, H);
const g = x.createRadialGradient(150, 0, 0, 150, 0, 900);
g.addColorStop(0, `rgba(${accRaw.split(/\s+/).join(',')},0.22)`);
g.addColorStop(1, 'rgba(0,0,0,0)');
x.fillStyle = g;
x.fillRect(0, 0, W, H);

x.fillStyle = acc;
x.font = font(600, 30);
x.fillText('POTENTIA SKIN ✨', 70, 100);
x.fillStyle = '#ffffff';
x.font = font(700, 58);
x.fillText(opts.title, 70, 175);

const load = (src: string) =>
new Promise<HTMLImageElement | null>(res => {
const i = new Image();
i.onload = () => res(i);
i.onerror = () => res(null);
i.src = src;
});
const pw = 455, ph = 600, py = 230;
const slots: [string | null, number, string][] = [
[opts.before, 70, opts.dayLabels[0]],
[opts.after, 70 + pw + 30, opts.dayLabels[1]],
];
for (const [src, px, label] of slots) {
x.save();
x.beginPath();
x.roundRect(px, py, pw, ph, 28);
x.clip();
x.fillStyle = '#16181c';
x.fillRect(px, py, pw, ph);
const img = src ? await load(src) : null;
if (img) {
const sc = Math.max(pw / img.width, ph / img.height);
const iw = img.width * sc, ih = img.height * sc;
x.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
}
x.restore();
x.fillStyle = 'rgba(0,0,0,0.55)';
x.beginPath();
x.roundRect(px + 20, py + ph - 70, 170, 50, 25);
x.fill();
x.fillStyle = '#fff';
x.font = font(600, 28);
x.fillText(label, px + 42, py + ph - 35);
}

let y = py + ph + 90;
for (const [k, v] of opts.lines) {
x.fillStyle = '#9aa4ad';
x.font = font(500, 34);
x.fillText(k, 70, y);
x.fillStyle = acc;
x.font = font(700, 40);
const tw = x.measureText(v).width;
x.fillText(v, W - 70 - tw, y);
y += 74;
}
x.fillStyle = '#6b7680';
x.font = font(500, 28);
x.fillText(opts.footer, 70, H - 60);

return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}

export function GlowChallenge({
acc,
uid,
paid,
refreshKey,
onGoSkin,
onStarted,
}: {
acc: SkinAccess;
uid: string;
paid: boolean;
refreshKey: number;
onGoSkin: () => void;
onStarted: (at: string) => void;
}) {
const { L } = useL();
const [checks, setChecks] = useState<Checkin[]>([]);
const [scans, setScans] = useState<ScanRow[]>([]);
const [pics, setPics] = useState<{ before: SkinPhoto | null; after: SkinPhoto | null }>({ before: null, after: null });
const [busy, setBusy] = useState(false);
const [shareMsg, setShareMsg] = useState('');

const start = acc.challenge_at ? Date.parse(acc.challenge_at) : null;
const day = start ? Math.floor((Date.now() - start) / DAY) + 1 : 0;
const running = !!start && day >= 1 && day <= LENGTH;
const finished = !!start && day > LENGTH && day <= LENGTH + 15;
const today = mmDate(Date.now());

useEffect(() => {
if (!start) return;
let alive = true;
(async () => {
const since = new Date(start - 60 * 1000).toISOString();
const [{ data: c }, { data: s }] = await Promise.all([
supabase.from('skin_checkins').select('day, am, pm').eq('user_id', uid).gte('day', mmDate(start)).order('day'),
supabase
.from('skin_scans')
.select('created_at, score, skin_age, maps, compare:report->compare')
.eq('user_id', uid)
.gte('created_at', since)
.order('created_at', { ascending: true }),
]);
if (!alive) return;
setChecks((c as Checkin[]) ?? []);
setScans((s ?? []) as unknown as ScanRow[]);
const photos = (await listSkinPhotos()).filter(p => p.at >= start - 60 * 1000);
setPics({ before: photos[0] ?? null, after: photos.length > 1 ? photos[photos.length - 1] : null });
})();
return () => {
alive = false;
};
}, [uid, start, refreshKey]);

const todayCheck = checks.find(c => c.day === today) ?? { day: today, am: false, pm: false };
const doneDays = checks.filter(c => c.am || c.pm).length;
const streak = (() => {
const set = new Set(checks.filter(c => c.am || c.pm).map(c => c.day));
let n = 0;
let t = Date.now();
if (!set.has(mmDate(t))) t -= DAY; // today not ticked yet: count from yesterday
while (set.has(mmDate(t))) {
n++;
t -= DAY;
}
return n;
})();
const scanDay = (ms: number) => Math.floor((ms - (start ?? 0)) / DAY) + 1;
const scanned = (d: number) => scans.some(s => Math.abs(scanDay(Date.parse(s.created_at)) - d) <= 1);
const dueScan = running && SCAN_DAYS.some(d => Math.abs(day - d) <= 1 && !scanned(d));

const tick = async (k: 'am' | 'pm') => {
const next = { ...todayCheck, [k]: !todayCheck[k] };
setChecks(cs => [...cs.filter(c => c.day !== today), next]);
const { error } = await supabase.rpc('skin_checkin', { p_am: next.am, p_pm: next.pm });
if (error) setChecks(cs => [...cs.filter(c => c.day !== today), todayCheck]);
else track('glow_checkin', { k, day });
};

const begin = async () => {
setBusy(true);
const { data, error } = await supabase.rpc('start_skin_challenge');
setBusy(false);
if (!error && data) {
track('glow_start', {});
onStarted(String(data));
}
};

/* ---- results ---- */
const first = scans[0];
const last = scans.length > 1 ? scans[scans.length - 1] : null;
const lastCompare = [...scans].reverse().find(s => s.compare)?.compare ?? null;
const resultLines: [string, string][] = [];
if (first?.skin_age != null && last?.skin_age != null) resultLines.push([L('Skin age', 'အသားအရေ အသက်'), `${first.skin_age} → ${last.skin_age}`]);
if (first?.score != null && last?.score != null) resultLines.push([L('Skin score', 'အသားအရေ အမှတ်'), `${Number(first.score).toFixed(1)} → ${Number(last.score).toFixed(1)}`]);
if (lastCompare) resultLines.push([L('Dark patches', 'တင်းကွက်'), `${lastCompare.patches > 0 ? '+' : ''}${lastCompare.patches}%`]);
resultLines.push([L('Routine days', 'Routine လုပ်ခဲ့တဲ့ ရက်'), `${doneDays}/${LENGTH}`]);

const share = async () => {
setShareMsg('');
const blob = await makeShareCard({
before: pics.before?.img ?? null,
after: pics.after?.img ?? null,
lines: resultLines,
title: L('My 30-day Glow Challenge', 'ကျွန်မရဲ့ ၃၀ ရက် Glow Challenge'),
dayLabels: [L('Day 1', 'ရက် ၁'), L(`Day ${Math.min(day, LENGTH)}`, `ရက် ${Math.min(day, LENGTH)}`)],
footer: 'potentia-sigma.vercel.app',
});
if (!blob) return;
const file = new File([blob], 'potentia-glow.png', { type: 'image/png' });
track('glow_share', {});
try {
const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
if (nav.canShare?.({ files: [file] })) {
await nav.share({ files: [file], title: 'Potentia Skin', text: L('My 30-day Glow Challenge ✨', 'ကျွန်မရဲ့ ၃၀ ရက် Glow Challenge ✨') });
return;
}
} catch {
return; // she closed the share sheet
}
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'potentia-glow.png';
a.click();
setShareMsg(L('Saved to your downloads.', 'Download ထဲ သိမ်းပြီးပါပြီ။'));
};

/* ---- not on Potentia Skin: the offer ---- */
if (!paid) {
return (
<div className="rounded-2xl p-5 space-y-3" style={accCard}>
<div className="flex items-center gap-2">
<Trophy className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('30-day Glow Challenge', '၃၀ ရက် Glow Challenge')}</span>
</div>
<ul className="space-y-1.5 text-[13px] text-[rgb(var(--muted-hover))]">
{[
L('Your routine every morning and night, tick it off', 'မနက်/ည routine လုပ်ပြီး အမှတ်ခြစ်'),
L('Scan on day 1, 7, 14, 21 and 30', 'ရက် ၁၊ ၇၊ ၁၄၊ ၂၁ နဲ့ ၃၀ မှာ scan'),
L('See your dark patches fade, then share your before & after', 'တင်းကွက် ပျော့သွားတာ ကြည့်ပြီး before & after ကို share'),
].map(t => (
<li key={t} className="flex gap-2">
<Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: ACC }} /> {t}
</li>
))}
</ul>
<button onClick={onGoSkin} className="w-full font-semibold py-3.5 rounded-xl text-sm" style={{ background: ACC, color: ACC_INK }}>
{L(`Start with Potentia Skin · 1 month ${fmtMMK(planMmk('skin_1month'))}`, `Potentia Skin ၁ လ ${fmtMMK(planMmk('skin_1month'))} နဲ့ စမယ်`)}
</button>
</div>
);
}

/* ---- not started (or long finished) ---- */
if (!running && !finished) {
return (
<div className="rounded-2xl p-5 space-y-3" style={accCard}>
<div className="flex items-center gap-2">
<Trophy className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('30-day Glow Challenge', '၃၀ ရက် Glow Challenge')}</span>
</div>
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-relaxed">
{L(
'Follow your routine for 30 days, tick it off every day, scan once a week. On day 30 you get your before & after, your new skin age and a card to share.',
'၃၀ ရက် routine လိုက်လုပ်၊ နေ့တိုင်း အမှတ်ခြစ်၊ အပတ်တိုင်း scan။ ရက် ၃၀ ပြည့်ရင် before & after၊ အသားအရေ အသက်အသစ်နဲ့ share လို့ရတဲ့ ကတ် ရမယ်။'
)}
</p>
<button onClick={begin} disabled={busy} className="w-full font-semibold py-3.5 rounded-xl text-sm disabled:opacity-60" style={{ background: ACC, color: ACC_INK }}>
{L('Start my challenge today', 'ဒီနေ့ စမယ်')}
</button>
</div>
);
}

/* ---- running ---- */
if (running) {
return (
<div className="rounded-2xl p-5 space-y-4" style={accCard}>
<div className="flex items-center justify-between">
<span className="flex items-center gap-2">
<Trophy className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('Glow Challenge', 'Glow Challenge')}</span>
</span>
<span className="text-[13px] font-semibold" style={{ color: ACC }}>
{L(`Day ${day} of ${LENGTH}`, `ရက် ${day} / ${LENGTH}`)}
</span>
</div>
<div className="h-2 rounded-full" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-2 rounded-full" style={{ width: `${(day / LENGTH) * 100}%`, background: ACC }} />
</div>

<div className="grid grid-cols-2 gap-2">
{(
[
['am', Sun, L('Morning done', 'မနက် ပြီးပြီ')],
['pm', Moon, L('Night done', 'ည ပြီးပြီ')],
] as const
).map(([k, Icon, label]) => {
const on = todayCheck[k];
return (
<button
key={k}
onClick={() => tick(k)}
className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition-all"
style={on ? { background: ACC, color: ACC_INK } : { border: '1px solid rgb(var(--gold) / 0.5)', color: 'rgb(var(--muted-hover))' }}
>
{on ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />} {label}
</button>
);
})}
</div>

<div className="flex items-center justify-around text-center">
<div>
<p className="font-display text-xl font-semibold text-[rgb(var(--gold))] flex items-center gap-1 justify-center">
<Flame className="w-4 h-4" style={{ color: '#FF9F43' }} /> {streak}
</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{L('day streak', 'ရက် ဆက်တိုက်')}</p>
</div>
<div>
<p className="font-display text-xl font-semibold text-[rgb(var(--gold))]">
{doneDays}/{day}
</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{L('routine days', 'routine လုပ်တဲ့ရက်')}</p>
</div>
</div>

<div>
<p className="text-[11px] text-[rgb(var(--muted))] mb-2">{L('Scan days', 'Scan ရက်များ')}</p>
<div className="flex justify-between">
{SCAN_DAYS.map(d => {
const ok = scanned(d);
const now = Math.abs(day - d) <= 1 && !ok;
return (
<div key={d} className="flex flex-col items-center gap-1">
<span
className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold"
style={
ok
? { background: ACC, color: ACC_INK }
: now
? { border: `2px solid ${ACC}`, color: ACC }
: { border: '1px solid rgb(var(--muted) / 0.3)', color: 'rgb(var(--muted))' }
}
>
{ok ? <Check className="w-4 h-4" /> : d}
</span>
</div>
);
})}
</div>
</div>
{dueScan && (
<p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: ACC }}>
<Camera className="w-4 h-4" /> {L("Scan day! Take today's skin scan by the window.", 'ဒီနေ့ scan ရက်! ပြတင်းပေါက်နားမှာ skin scan ရိုက်ပါ။')}
</p>
)}
{lastCompare && lastCompare.patches < 0 && (
<p className="text-[12px]" style={{ color: GOOD }}>
<Sparkles className="w-3.5 h-3.5 inline -mt-0.5" /> {L(`Dark patches ${lastCompare.patches}% so far. Keep going!`, `အခုထိ တင်းကွက် ${lastCompare.patches}%။ ဆက်လုပ်ပါ!`)}
</p>
)}
</div>
);
}

/* ---- finished: results + share ---- */
const needFinal = !scans.some(s => scanDay(Date.parse(s.created_at)) >= LENGTH - 3);
return (
<div className="rounded-2xl p-5 space-y-4" style={accCard}>
<div className="flex items-center gap-2">
<Trophy className="w-4 h-4" style={{ color: ACC }} />
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">{L('You finished the Glow Challenge! 🎉', 'Glow Challenge ပြီးပါပြီ! 🎉')}</span>
</div>
{needFinal ? (
<p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: ACC }}>
<Camera className="w-4 h-4" /> {L('Take your final skin scan to see your results.', 'ရလဒ်ကြည့်ဖို့ နောက်ဆုံး skin scan ရိုက်ပါ။')}
</p>
) : (
<>
{pics.before && pics.after && <BeforeAfterPics before={pics.before} after={pics.after} />}
<div className="space-y-1.5">
{resultLines.map(([k, v]) => (
<div key={k} className="flex justify-between text-[13px]">
<span className="text-[rgb(var(--muted-hover))]">{k}</span>
<span className="font-semibold" style={{ color: ACC }}>
{v}
</span>
</div>
))}
</div>
<button onClick={share} className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm" style={{ background: ACC, color: ACC_INK }}>
<Share2 className="w-4 h-4" /> {L('Share my before & after', 'Before & after ကို share မယ်')}
</button>
{shareMsg && <p className="text-[11px] text-[rgb(var(--muted))] text-center">{shareMsg}</p>}
</>
)}
<button onClick={begin} disabled={busy} className="w-full rounded-xl py-3 text-[13px] font-medium disabled:opacity-60" style={{ border: '1px solid rgb(var(--gold) / 0.5)', color: ACC }}>
{L('Start a new 30 days', 'ရက် ၃၀ အသစ် စမယ်')}
</button>
</div>
);
}

