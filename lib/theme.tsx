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
text-[rgb(var(--gold))] border-[rgb(var(--gold)/0.5)] */
export function ThemeStyles() {
return (
<style>{`
:root, :root[data-theme="dark"] {
color-scheme: dark;
--bg: 5 5 5;
--surface: 13 13 13;
--gold: 201 162 75;
--gold-hover: 240 201 74;
--muted: 122 110 93;
--muted-hover: 176 164 143;
--err: 208 138 120;
--glow: 212 175 110;
--glow-a: 0.07;
--vein-a: 0.55;
}
:root[data-theme="light"] {
color-scheme: light;
--bg: 255 255 255;
--surface: 250 248 243;
--gold: 138 106 31;
--gold-hover: 107 80 21;
--muted: 110 100 83;
--muted-hover: 80 72 58;
--err: 179 64 46;
--glow: 201 162 75;
--glow-a: 0.12;
--vein-a: 0.45;
}
html { background: rgb(var(--bg)); }
.marble-img {
position: fixed; inset: 0; pointer-events: none;
background-size: cover; background-position: center; background-repeat: no-repeat;
}
:root[data-theme="dark"] .marble-img,
:root:not([data-theme]) .marble-img {
background-image: linear-gradient(rgb(0 0 0 / 0.15), rgb(0 0 0 / 0.15)), url('/marble-dark.jpg');
}
:root[data-theme="light"] .marble-img {
background-image: linear-gradient(rgb(255 255 255 / 0.2), rgb(255 255 255 / 0.2)), url('/marble-light.jpg');
}
`}</style>
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

/* Marble veins drawn as an inline SVG, colored by the theme */
export function MarbleBackground() {
const layer = (id: string, freq: string, seed: number, opacity: string) => (
<>
<filter id={id} x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={5} seed={seed} result="n" />
<feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="a" />
<feComponentTransfer in="a" result="v">
<feFuncA type="table" tableValues="0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0" />
</feComponentTransfer>
<feFlood style={{ floodColor: 'rgb(var(--gold))' }} result="c" />
<feComposite in="c" in2="v" operator="in" />
</filter>
<rect width="100%" height="100%" filter={`url(#${id})`} style={{ opacity }} />
</>
);
return (
<svg
aria-hidden="true"
className="fixed inset-0 w-full h-full pointer-events-none"
xmlns="http://www.w3.org/2000/svg"
>
{layer('marble-a', '0.006 0.010', 7, 'var(--vein-a)')}
{layer('marble-b', '0.004 0.007', 23, 'calc(var(--vein-a) * 0.5)')}
</svg>
);
}

/* Real marble photos: public/marble-dark.jpg and public/marble-light.jpg.
If a file is missing, the drawn veins above stay visible instead. */
export function MarbleImage() {
return <div className="marble-img" aria-hidden="true" />;
}

