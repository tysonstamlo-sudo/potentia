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
export function ThemeStyles() {
return (
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
html { background: rgb(var(--bg)); }
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

/* Ambient lab grid + corner glows, colored by the theme accent.
Replaces the old marble veins — same export name so existing imports
(e.g. login/page.tsx) keep working untouched. */
export function MarbleBackground() {
return (
<>
<div
aria-hidden="true"
className="fixed inset-0 pointer-events-none"
style={{
backgroundImage:
'linear-gradient(rgb(var(--gold) / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--gold) / 0.05) 1px, transparent 1px)',
backgroundSize: '28px 28px',
}}
/>
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

/* No photographic texture in the Lab theme — the grid above carries it.
Kept as a real (no-op) component so `<MarbleImage />` in pages you've
already shipped (like login) doesn't need to be touched or removed. */
export function MarbleImage() {
return null;
}

