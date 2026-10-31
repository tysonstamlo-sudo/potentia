'use client';

// app/components/NutritionTracker.tsx — calorie + macro tracker.
// Free: pick foods from the list or add your own. Premium: snap a photo of your meal and AI estimates it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { FOODS, calcTargets, type Food, type NutritionSettings, type Targets } from '../../lib/foods';
import { toAiImage, callAi, aiErrorText } from '../../lib/aiClient';
import { Sheet, cardStyle, inputStyle, primaryBtn } from './shopShared';
import { Search, Plus, Minus, Trash2, Camera, Loader2, Crown, ChevronLeft, ChevronRight, Settings2, Utensils, Check } from 'lucide-react';

type Log = {
id: string;
name: string;
servings: number;
kcal: number;
protein: number;
carbs: number;
fat: number;
source: string;
};

/** Today's date in Myanmar (YYYY-MM-DD), optionally moved by n days. */
export function mmDate(offsetDays = 0) {
const d = new Date(Date.now() + offsetDays * 86400000);
return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yangon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const sum = (logs: Log[]) =>
logs.reduce(
(a, l) => ({ kcal: a.kcal + l.kcal, protein: a.protein + l.protein, carbs: a.carbs + l.carbs, fat: a.fat + l.fat }),
{ kcal: 0, protein: 0, carbs: 0, fat: 0 },
);

const r1 = (n: number) => Math.round(n * 10) / 10;

function Bar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
return (
<div>
<div className="flex justify-between text-[11px] mb-1">
<span className="text-[rgb(var(--muted-hover))]">{label}</span>
<span className="text-[rgb(var(--muted))]">
<span className="text-[rgb(var(--gold))] font-semibold">{Math.round(value)}</span> / {target} g
</span>
</div>
<div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
</div>
</div>
);
}

/* ---------------- dashboard card ---------------- */
export function NutritionCard({ userId, onOpen, refreshKey = 0 }: { userId: string; onOpen: () => void; refreshKey?: number }) {
const { t } = useLang();
const [targets, setTargets] = useState<Targets | null>(null);
const [eaten, setEaten] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

useEffect(() => {
(async () => {
const [{ data: p }, { data: logs }] = await Promise.all([
supabase.from('profiles').select('nutrition').eq('id', userId).single(),
supabase.from('food_logs').select('kcal, protein, carbs, fat').eq('user_id', userId).eq('eaten_on', mmDate()),
]);
const s = (p as { nutrition?: NutritionSettings | null } | null)?.nutrition;
setTargets(s ? calcTargets(s) : null);
setEaten(sum(((logs ?? []) as Log[]).map(l => ({ ...l, kcal: Number(l.kcal), protein: Number(l.protein), carbs: Number(l.carbs), fat: Number(l.fat) }))));
})();
}, [userId, refreshKey]);

const pct = targets ? Math.min(100, (eaten.kcal / targets.kcal) * 100) : 0;
return (
<button onClick={onOpen} className="w-full text-left p-5 rounded-2xl" style={cardStyle}>
<div className="flex items-center justify-between mb-3">
<span className="font-body text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase flex items-center gap-2">
<Utensils className="w-3.5 h-3.5 text-[rgb(var(--gold))]" /> {t('Nutrition today')}
</span>
<ChevronRight className="w-4 h-4 text-[rgb(var(--muted))]" />
</div>
{targets ? (
<>
<div className="flex items-baseline gap-2 mb-2">
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">{Math.round(eaten.kcal)}</span>
<span className="font-body text-xs text-[rgb(var(--muted))]">/ {targets.kcal} kcal</span>
<span className="font-body text-xs text-[rgb(var(--muted-hover))] ml-auto">
{t('Protein')} {Math.round(eaten.protein)}/{targets.protein} g
</span>
</div>
<div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'rgb(var(--gold))' }} />
</div>
</>
) : (
<p className="font-body text-sm text-[rgb(var(--muted-hover))]">{t('Track calories, protein, carbs and fat. Tap to set your goal.')}</p>
)}
</button>
);
}

/* ---------------- setup ---------------- */
function Setup({ initial, onSave }: { initial: NutritionSettings; onSave: (s: NutritionSettings) => void }) {
const { t } = useLang();
const [s, setS] = useState<NutritionSettings>(initial);
const [error, setError] = useState('');
const set = <K extends keyof NutritionSettings>(k: K, v: NutritionSettings[K]) => setS(p => ({ ...p, [k]: v }));
const chips = <K extends 'sex' | 'activity' | 'goal'>(k: K, opts: [NutritionSettings[K], string][]) => (
<div className="flex flex-wrap gap-2">
{opts.map(([v, label]) => {
const active = s[k] === v;
return (
<button
key={String(v)}
type="button"
onClick={() => set(k, v)}
className="text-xs rounded-full px-3.5 py-2"
style={{
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{t(label)}
</button>
);
})}
</div>
);
const num = (k: 'age' | 'heightCm' | 'weightKg', label: string) => (
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t(label)}</label>
<input
inputMode="decimal"
value={s[k] || ''}
onChange={e => set(k, Number(e.target.value.replace(/[^0-9.]/g, '')))}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
);
const save = () => {
if (!(s.age >= 16 && s.age <= 90)) return setError(t('Enter your age (16 or older).'));
if (!(s.heightCm >= 120 && s.heightCm <= 230)) return setError(t('Enter your height in cm.'));
if (!(s.weightKg >= 30 && s.weightKg <= 250)) return setError(t('Enter your weight in kg.'));
onSave(s);
};
return (
<div className="space-y-4">
<p className="text-sm text-[rgb(var(--muted-hover))]">{t('We use this to work out your daily calories and protein.')}</p>
{chips('sex', [
['male', 'Male'],
['female', 'Female'],
])}
<div className="grid grid-cols-3 gap-3">
{num('age', 'Age')}
{num('heightCm', 'Height (cm)')}
{num('weightKg', 'Weight (kg)')}
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('How active are you?')}</label>
{chips('activity', [
['low', 'Not very active'],
['medium', 'Train 3-4x a week'],
['high', 'Train 5+ times a week'],
])}
</div>
<div>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{t('Your goal')}</label>
{chips('goal', [
['lose', 'Lose fat'],
['maintain', 'Stay the same'],
['gain', 'Build muscle'],
])}
</div>
{error && <p className="text-xs text-[rgb(var(--err))]">{error}</p>}
<button onClick={save} className="w-full font-semibold py-4 rounded-2xl text-[15px]" style={primaryBtn}>
{t('Save my goal')}
</button>
<p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed">
{t('These are estimates. If you have a health condition, are pregnant, or have struggled with eating, talk to a doctor first.')}
</p>
</div>
);
}

/* ---------------- main ---------------- */
export default function NutritionTracker({
userId,
isPremium,
onGoPremium,
onClose,
}: {
userId: string;
isPremium: boolean;
onGoPremium: () => void;
onClose: () => void;
}) {
const { t, lang } = useLang();
const [mode, setMode] = useState<'day' | 'setup' | 'search' | 'custom' | 'photo'>('day');
const [settings, setSettings] = useState<NutritionSettings | null>(null);
const [loaded, setLoaded] = useState(false);
const [dayOffset, setDayOffset] = useState(0);
const [logs, setLogs] = useState<Log[]>([]);
const [busy, setBusy] = useState(false);
const [query, setQuery] = useState('');
const [servings, setServings] = useState<Record<string, number>>({});
const [custom, setCustom] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
const [msg, setMsg] = useState('');
const [aiItems, setAiItems] = useState<(Food & { on: boolean })[]>([]);
const [aiBusy, setAiBusy] = useState(false);
const [aiErr, setAiErr] = useState('');
const fileRef = useRef<HTMLInputElement | null>(null);

const day = mmDate(dayOffset);
const targets = settings ? calcTargets(settings) : null;
const eaten = sum(logs);

const loadDay = useCallback(async () => {
const { data } = await supabase
.from('food_logs')
.select('id, name, servings, kcal, protein, carbs, fat, source')
.eq('user_id', userId)
.eq('eaten_on', day)
.order('created_at', { ascending: true });
setLogs(
((data ?? []) as Log[]).map(l => ({
...l,
servings: Number(l.servings),
kcal: Number(l.kcal),
protein: Number(l.protein),
carbs: Number(l.carbs),
fat: Number(l.fat),
})),
);
}, [userId, day]);

useEffect(() => {
(async () => {
const { data } = await supabase.from('profiles').select('nutrition, gender').eq('id', userId).single();
const p = data as { nutrition?: NutritionSettings | null; gender?: string | null } | null;
if (p?.nutrition) setSettings(p.nutrition);
else {
setSettings(null);
setMode('setup');
}
setLoaded(true);
})();
}, [userId]);

useEffect(() => {
loadDay();
}, [loadDay]);

const saveSettings = async (s: NutritionSettings) => {
setBusy(true);
await supabase.from('profiles').update({ nutrition: s }).eq('id', userId);
setSettings(s);
setBusy(false);
setMode('day');
};

const add = async (rows: { name: string; servings: number; kcal: number; protein: number; carbs: number; fat: number; source: string }[]) => {
if (!rows.length) return;
setBusy(true);
const { error } = await supabase.from('food_logs').insert(
rows.map(r => ({
user_id: userId,
eaten_on: day,
name: r.name.slice(0, 80),
servings: r.servings,
kcal: Math.round(r.kcal),
protein: r1(r.protein),
carbs: r1(r.carbs),
fat: r1(r.fat),
source: r.source,
})),
);
setBusy(false);
if (error) {
console.error(error);
setMsg(t('Could not save. Check your connection and try again.'));
return;
}
setMsg(rows.length === 1 ? t('Added {name}', { name: rows[0].name }) : t('Added {n} foods', { n: rows.length }));
setTimeout(() => setMsg(''), 2000);
await loadDay();
};

const addFood = (f: Food) => {
const n = servings[f.id] ?? 1;
add([{ name: f.name, servings: n, kcal: f.kcal * n, protein: f.protein * n, carbs: f.carbs * n, fat: f.fat * n, source: 'list' }]);
setServings(s => ({ ...s, [f.id]: 1 }));
};

const remove = async (id: string) => {
setLogs(l => l.filter(x => x.id !== id));
await supabase.from('food_logs').delete().eq('id', id);
};

const addCustom = async () => {
const kcal = Number(custom.kcal);
if (!custom.name.trim() || !(kcal >= 0 && kcal <= 10000)) return setMsg(t('Add a name and the calories.'));
await add([
{
name: custom.name.trim(),
servings: 1,
kcal,
protein: Number(custom.protein) || 0,
carbs: Number(custom.carbs) || 0,
fat: Number(custom.fat) || 0,
source: 'custom',
},
]);
setCustom({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
setMode('day');
};

const pickPhoto = async (file: File | undefined) => {
if (!file) return;
setAiBusy(true);
setAiErr('');
setAiItems([]);
try {
const image = await toAiImage(file, 1024);
const r = await callAi<{ items: { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }[] }>(
'/api/ai/food',
{ image },
);
if (!r.ok) return setAiErr(t(aiErrorText(r.code)));
if (!r.data.items.length) return setAiErr(t('No food found in that photo. Try a clearer one.'));
setAiItems(
r.data.items.map((it, i) => ({
id: `ai${i}`,
name: it.name,
serving: `${Math.round(it.grams)} g`,
kcal: it.kcal,
protein: it.protein,
carbs: it.carbs,
fat: it.fat,
tag: 'other' as const,
on: true,
})),
);
} catch {
setAiErr(t(aiErrorText('error')));
} finally {
setAiBusy(false);
if (fileRef.current) fileRef.current.value = '';
}
};

const shown = useMemo(() => {
const q = query.trim().toLowerCase();
return q ? FOODS.filter(f => f.name.toLowerCase().includes(q) || (f.my ?? '').includes(query.trim())) : FOODS;
}, [query]);

const title =
mode === 'setup' ? t('Your goal') : mode === 'search' ? t('Add food') : mode === 'custom' ? t('Add your own') : mode === 'photo' ? t('Snap your meal') : t('Nutrition');

const back = () => (mode === 'day' || (mode === 'setup' && !settings) ? onClose() : setMode('day'));

return (
<Sheet onClose={back} title={title}>
{!loaded ? (
<div className="flex justify-center py-16">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
) : mode === 'setup' ? (
<Setup
initial={settings ?? { sex: 'male', age: 20, heightCm: 170, weightKg: 65, activity: 'medium', goal: 'lose' }}
onSave={saveSettings}
/>
) : mode === 'search' ? (
<div>
<div className="relative mb-4">
<Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" />
<input
value={query}
onChange={e => setQuery(e.target.value)}
placeholder={t('Search: mohinga, rice, egg...')}
className="w-full rounded-2xl pl-11 pr-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
autoFocus
/>
</div>
{msg && <p className="text-xs text-[rgb(var(--gold))] mb-3">{msg}</p>}
<div className="space-y-2">
{shown.map(f => {
const n = servings[f.id] ?? 1;
return (
<div key={f.id} className="rounded-2xl p-3 flex items-center gap-3" style={cardStyle}>
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--gold))] truncate">{lang === 'my' && f.my ? `${f.my} · ${f.name}` : f.name}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{f.serving} · {Math.round(f.kcal * n)} kcal · P {r1(f.protein * n)} · C {r1(f.carbs * n)} · F {r1(f.fat * n)}
</p>
</div>
<div className="flex items-center gap-1.5 flex-shrink-0">
<button
onClick={() => setServings(s => ({ ...s, [f.id]: Math.max(0.5, n - 0.5) }))}
className="w-7 h-7 rounded-lg flex items-center justify-center"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
aria-label="Less"
>
<Minus className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
</button>
<span className="text-xs text-[rgb(var(--gold))] w-7 text-center">{n}×</span>
<button
onClick={() => setServings(s => ({ ...s, [f.id]: Math.min(10, n + 0.5) }))}
className="w-7 h-7 rounded-lg flex items-center justify-center"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
aria-label="More"
>
<Plus className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
</button>
<button onClick={() => addFood(f)} disabled={busy} className="ml-1 text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50" style={primaryBtn}>
{t('Add')}
</button>
</div>
</div>
);
})}
{shown.length === 0 && <p className="text-center text-sm text-[rgb(var(--muted))] py-6">{t('Not in the list? Add your own.')}</p>}
</div>
<button onClick={() => setMode('custom')} className="w-full mt-4 text-sm font-medium py-3 rounded-2xl" style={cardStyle}>
+ {t('Add your own food')}
</button>
<p className="text-[10px] text-[rgb(var(--muted))] mt-3 text-center">{t('Values are estimates per typical serving.')}</p>
</div>
) : mode === 'custom' ? (
<div className="space-y-3">
<input
value={custom.name}
onChange={e => setCustom(c => ({ ...c, name: e.target.value }))}
placeholder={t('Food name')}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
<div className="grid grid-cols-2 gap-3">
{(
[
['kcal', 'Calories (kcal)'],
['protein', 'Protein (g)'],
['carbs', 'Carbs (g)'],
['fat', 'Fat (g)'],
] as const
).map(([k, label]) => (
<div key={k}>
<label className="text-[11px] text-[rgb(var(--muted))] block mb-1">{t(label)}</label>
<input
inputMode="decimal"
value={custom[k]}
onChange={e => setCustom(c => ({ ...c, [k]: e.target.value.replace(/[^0-9.]/g, '') }))}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={inputStyle}
/>
</div>
))}
</div>
{msg && <p className="text-xs text-[rgb(var(--err))]">{msg}</p>}
<button onClick={addCustom} disabled={busy} className="w-full font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60" style={primaryBtn}>
{t('Add')}
</button>
</div>
) : mode === 'photo' ? (
<div>
<input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />
{!isPremium ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<Crown className="w-7 h-7 mx-auto mb-3 text-[rgb(var(--gold))]" />
<p className="text-sm text-[rgb(var(--gold))] font-semibold mb-1">{t('Snap your meal is Premium')}</p>
<p className="text-xs text-[rgb(var(--muted))] mb-4">{t('Take a photo and AI estimates calories, protein, carbs and fat for you.')}</p>
<button onClick={onGoPremium} className="font-semibold py-3 px-6 rounded-xl text-sm" style={primaryBtn}>
{t('Go Premium')}
</button>
</div>
) : (
<>
<button
onClick={() => fileRef.current?.click()}
disabled={aiBusy}
className="w-full rounded-3xl p-8 text-center disabled:opacity-60"
style={{ ...cardStyle, borderStyle: 'dashed' }}
>
{aiBusy ? (
<Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-[rgb(var(--gold))]" />
) : (
<Camera className="w-8 h-8 mx-auto mb-2 text-[rgb(var(--gold))]" />
)}
<span className="text-sm text-[rgb(var(--gold))] font-medium">{aiBusy ? t('Reading your meal...') : t('Take or choose a photo')}</span>
<span className="block text-[11px] text-[rgb(var(--muted))] mt-1">{t('Shoot from above, with the whole plate in the photo.')}</span>
</button>
{aiErr && <p className="text-xs text-[rgb(var(--err))] mt-3">{aiErr}</p>}
{aiItems.length > 0 && (
<div className="mt-5 space-y-2">
<p className="text-[11px] text-[rgb(var(--muted))]">{t('Check the list. Untick anything that is wrong.')}</p>
{aiItems.map((it, i) => (
<button
key={it.id}
onClick={() => setAiItems(list => list.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
className="w-full rounded-2xl p-3 flex items-center gap-3 text-left"
style={{ ...cardStyle, opacity: it.on ? 1 : 0.45 }}
>
<span
className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
style={{ background: it.on ? 'rgb(var(--gold))' : 'transparent', border: it.on ? 'none' : '1.5px solid rgb(var(--muted) / 0.5)' }}
>
{it.on && <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--bg))' }} />}
</span>
<span className="flex-1 min-w-0">
<span className="block text-sm text-[rgb(var(--gold))] truncate">{it.name}</span>
<span className="block text-[11px] text-[rgb(var(--muted))]">
~{it.serving} · {it.kcal} kcal · P {it.protein} · C {it.carbs} · F {it.fat}
</span>
</span>
</button>
))}
<button
onClick={async () => {
await add(
aiItems.filter(x => x.on).map(x => ({ name: x.name, servings: 1, kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, source: 'ai' })),
);
setAiItems([]);
setMode('day');
}}
disabled={busy || !aiItems.some(x => x.on)}
className="w-full font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-50"
style={primaryBtn}
>
{t('Add to today')}
</button>
<p className="text-[10px] text-[rgb(var(--muted))] text-center">{t('AI estimates can be off. Oil and sauces are hard to see.')}</p>
</div>
)}
</>
)}
</div>
) : (
/* ---------------- day view ---------------- */
<div>
<div className="flex items-center justify-between mb-4">
<button onClick={() => setDayOffset(d => d - 1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgb(var(--muted) / 0.12)' }} aria-label="Previous day">
<ChevronLeft className="w-4 h-4 text-[rgb(var(--gold))]" />
</button>
<span className="text-sm font-medium text-[rgb(var(--gold))]">
{dayOffset === 0 ? t('Today') : dayOffset === -1 ? t('Yesterday') : day}
</span>
<button
onClick={() => setDayOffset(d => Math.min(0, d + 1))}
disabled={dayOffset === 0}
className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
aria-label="Next day"
>
<ChevronRight className="w-4 h-4 text-[rgb(var(--gold))]" />
</button>
</div>

{targets && (
<div className="rounded-3xl p-5 mb-4" style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.12), rgb(var(--surface) / 0.5))', border: '1px solid rgb(var(--gold) / 0.3)' }}>
<div className="flex items-center gap-5 mb-5">
<div className="relative w-28 h-28 flex-shrink-0">
<svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
<circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--muted) / 0.2)" strokeWidth="9" />
<circle
cx="50"
cy="50"
r="42"
fill="none"
stroke={eaten.kcal > targets.kcal * 1.05 ? 'rgb(var(--err))' : 'rgb(var(--gold))'}
strokeWidth="9"
strokeLinecap="round"
strokeDasharray={2 * Math.PI * 42}
strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(1, eaten.kcal / targets.kcal))}
/>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))] leading-none">{Math.max(0, targets.kcal - Math.round(eaten.kcal))}</span>
<span className="text-[9px] text-[rgb(var(--muted))] uppercase tracking-wider mt-1">{t('kcal left')}</span>
</div>
</div>
<div className="text-sm space-y-1">
<p className="text-[rgb(var(--muted-hover))]">
{t('Eaten')} <span className="text-[rgb(var(--gold))] font-semibold">{Math.round(eaten.kcal)}</span>
</p>
<p className="text-[rgb(var(--muted-hover))]">
{t('Goal')} <span className="text-[rgb(var(--gold))] font-semibold">{targets.kcal}</span>
</p>
<button onClick={() => setMode('setup')} className="flex items-center gap-1 text-[11px] text-[rgb(var(--muted))] mt-1">
<Settings2 className="w-3 h-3" /> {t('Change goal')}
</button>
</div>
</div>
<div className="space-y-3">
<Bar label={t('Protein')} value={eaten.protein} target={targets.protein} color="rgb(var(--gold))" />
<Bar label={t('Carbs')} value={eaten.carbs} target={targets.carbs} color="rgb(var(--gold) / 0.7)" />
<Bar label={t('Fat')} value={eaten.fat} target={targets.fat} color="rgb(var(--gold) / 0.45)" />
</div>
</div>
)}

<div className="grid grid-cols-3 gap-2 mb-5">
<button onClick={() => setMode('search')} className="rounded-2xl py-4 flex flex-col items-center gap-1.5 text-xs font-medium" style={primaryBtn}>
<Search className="w-5 h-5" /> {t('Food list')}
</button>
<button onClick={() => setMode('photo')} className="rounded-2xl py-4 flex flex-col items-center gap-1.5 text-xs font-medium relative" style={cardStyle}>
<Camera className="w-5 h-5 text-[rgb(var(--gold))]" />
<span className="text-[rgb(var(--gold))]">{t('Snap meal')}</span>
{!isPremium && <Crown className="w-3 h-3 absolute top-2 right-2 text-[rgb(var(--gold))]" />}
</button>
<button onClick={() => setMode('custom')} className="rounded-2xl py-4 flex flex-col items-center gap-1.5 text-xs font-medium" style={cardStyle}>
<Plus className="w-5 h-5 text-[rgb(var(--gold))]" />
<span className="text-[rgb(var(--gold))]">{t('Own food')}</span>
</button>
</div>

{msg && <p className="text-xs text-[rgb(var(--gold))] mb-3">{msg}</p>}

{logs.length === 0 ? (
<p className="text-center text-sm text-[rgb(var(--muted))] py-6">{t('Nothing logged yet.')}</p>
) : (
<div className="space-y-2">
{logs.map(l => (
<div key={l.id} className="rounded-2xl p-3 flex items-center gap-3" style={cardStyle}>
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--gold))] truncate">
{l.name}
{l.servings !== 1 && <span className="text-[rgb(var(--muted))]"> · {l.servings}×</span>}
</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{Math.round(l.kcal)} kcal · P {r1(l.protein)} · C {r1(l.carbs)} · F {r1(l.fat)}
</p>
</div>
<button onClick={() => remove(l.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--err) / 0.1)', color: 'rgb(var(--err))' }} aria-label="Delete">
<Trash2 className="w-4 h-4" />
</button>
</div>
))}
</div>
)}
</div>
)}
</Sheet>
);
}

