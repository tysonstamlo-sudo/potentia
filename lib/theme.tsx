'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export type Theme = 'dark' | 'light';
const KEY = 'potentia-theme';

function apply(t: Theme) {
document.documentElement.setAttribute('data-theme', t);
}

export function useTheme() {
const [theme, setTheme] = useState<Theme>('dark');

useEffect(() => {
let saved: string | null = null;
try {
saved = localStorage.getItem(KEY);
} catch {}
const t: Theme =
saved === 'light' || saved === 'dark'
? saved
: window.matchMedia('(prefers-color-scheme: light)').matches
? 'light'
: 'dark';
apply(t);
setTheme(t);
}, []);

const toggle = () => {
const t: Theme = theme === 'dark' ? 'light' : 'dark';
apply(t);
setTheme(t);
try {
localStorage.setItem(KEY, t);
} catch {}
};

return { theme, toggle };
}

/* Colors are stored as "R G B" channels so Tailwind opacity works:
text-[rgb(var(--gold))] border-[rgb(var(--gold)/0.5)]

Biometric Lab palette: graphite surfaces, one electric-cyan accent.
(Variable names kept as --gold/--muted/etc. from the old marble theme
so nothing importing these tokens elsewhere needs to change — only
the values moved.) */
/* ---------- app colour (chosen in Settings) ---------- */
export type Accent = 'blue' | 'gold' | 'green' | 'purple' | 'pink' | 'red';
const ACCENT_KEY = 'potentia-accent';
// [dark theme main, dark hover, light theme main, light hover] as "R G B"
export const ACCENTS: Record<Accent, { en: string; my: string; swatch: string; v: [string, string, string, string] }> = {
blue: { en: 'Ice blue', my: 'အပြာ', swatch: '#4FD8FF', v: ['79 216 255', '130 232 255', '11 122 158', '8 94 122'] },
gold: { en: 'Gold', my: 'ရွှေရောင်', swatch: '#F2C94C', v: ['242 201 76', '247 219 130', '161 118 10', '128 92 6'] },
green: { en: 'Emerald', my: 'အစိမ်း', swatch: '#3EE0A0', v: ['62 224 160', '120 236 190', '10 135 90', '6 105 70'] },
purple: { en: 'Violet', my: 'ခရမ်း', swatch: '#B18CFF', v: ['177 140 255', '204 178 255', '108 64 214', '86 48 178'] },
pink: { en: 'Rose', my: 'ပန်းရောင်', swatch: '#F2A6BC', v: ['242 166 188', '248 196 211', '196 62 104', '160 44 82'] },
red: { en: 'Crimson', my: 'အနီ', swatch: '#FF6B6B', v: ['255 107 107', '255 150 150', '196 40 52', '160 28 40'] },
};
const isAccent = (a: string | null): a is Accent => !!a && a in ACCENTS;

function applyAccent(a: Accent) {
document.documentElement.setAttribute('data-accent', a);
}

export function useAccent() {
const [accent, setAccentState] = useState<Accent>('blue');
useEffect(() => {
let saved: string | null = null;
try {
saved = localStorage.getItem(ACCENT_KEY);
} catch {}
if (isAccent(saved)) setAccentState(saved);
}, []);
const setAccent = (a: Accent) => {
applyAccent(a);
setAccentState(a);
try {
localStorage.setItem(ACCENT_KEY, a);
} catch {}
};
return { accent, setAccent };
}

const accentCss = (Object.keys(ACCENTS) as Accent[])
.map(a => {
const [d, dh, l, lh] = ACCENTS[a].v;
return `:root[data-accent="${a}"], :root[data-accent="${a}"][data-theme="dark"] { --gold: ${d}; --gold-hover: ${dh}; --glow: ${d}; }
:root[data-accent="${a}"][data-theme="light"] { --gold: ${l}; --gold-hover: ${lh}; --glow: ${l}; }`;
})
.join('\n');

// runs before the page paints, so the saved colour shows with no flash
const accentBoot = `try{var a=localStorage.getItem('${ACCENT_KEY}');if(a)document.documentElement.setAttribute('data-accent',a)}catch(e){}`;

export function ThemeStyles() {
useEffect(() => {
try {
const a = localStorage.getItem(ACCENT_KEY);
if (isAccent(a)) applyAccent(a);
} catch {}
}, []);
return (
<>
<script dangerouslySetInnerHTML={{ __html: accentBoot }} />
<style>{`
:root, :root[data-theme="dark"] {
color-scheme: dark;
--bg: 6 7 8;
--surface: 15 17 19;
--gold: 79 216 255;
--gold-hover: 130 232 255;
--muted: 107 118 128;
--muted-hover: 155 166 175;
--err: 255 107 107;
--glow: 79 216 255;
--glow-a: 0.09;
}
:root[data-theme="light"] {
color-scheme: light;
--bg: 244 247 248;
--surface: 255 255 255;
--gold: 11 122 158;
--gold-hover: 8 94 122;
--muted: 100 110 118;
--muted-hover: 70 80 88;
--err: 200 50 50;
--glow: 59 158 255;
--glow-a: 0.12;
}
${accentCss}
html { background: rgb(var(--bg)); }
`}</style>
</>
);
}

/** Six colour dots for Settings. */
export function AccentPicker({ lang = 'en' }: { lang?: string }) {
const { accent, setAccent } = useAccent();
return (
<div className="grid grid-cols-3 gap-2">
{(Object.keys(ACCENTS) as Accent[]).map(a => {
const on = accent === a;
return (
<button
key={a}
type="button"
onClick={() => setAccent(a)}
aria-pressed={on}
className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] transition-all"
style={{
border: on ? `1.5px solid ${ACCENTS[a].swatch}` : '1px solid rgb(var(--muted) / 0.2)',
background: on ? 'rgb(var(--muted) / 0.12)' : 'transparent',
color: 'rgb(var(--muted-hover))',
}}
>
<span className="w-4 h-4 rounded-full shrink-0" style={{ background: ACCENTS[a].swatch, boxShadow: on ? `0 0 10px ${ACCENTS[a].swatch}` : 'none' }} />
{lang === 'my' ? ACCENTS[a].my : ACCENTS[a].en}
</button>
);
})}
</div>
);
}

export function ThemeToggle({ className = '' }: { className?: string }) {
const { theme, toggle } = useTheme();
return (
<button
type="button"
onClick={toggle}
aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
className={`p-2 rounded-full border border-[rgb(var(--muted)/0.3)] text-[rgb(var(--gold))] hover:border-[rgb(var(--gold))] transition-all ${className}`}
>
{theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
</button>
);
}

/* Soft corner glows, colored by the theme accent (the grid was removed: it looked like a math workbook).
Replaces the old marble veins — same export name so existing imports
(e.g. login/page.tsx) keep working untouched. */
export function MarbleBackground() {
return (
<>
<div
aria-hidden="true"
className="fixed inset-0 pointer-events-none"
style={{
background:
'radial-gradient(circle at 15% 0%, rgb(var(--glow) / var(--glow-a)), transparent 55%), radial-gradient(circle at 100% 30%, rgb(var(--glow) / calc(var(--glow-a) * 0.6)), transparent 50%)',
}}
/>
</>
);
}

/* No photographic texture in the Lab theme.
Kept as a real (no-op) component so `<MarbleImage />` in pages you've
already shipped (like login) doesn't need to be touched or removed. */
export function MarbleImage() {
return null;
}

