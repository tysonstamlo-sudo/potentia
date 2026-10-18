'use client';

// lib/i18n.tsx
// English / Burmese switch. Use: const { t, lang } = useLang(); then t('English text')
// The English sentence is the key. If there is no Burmese for it yet, English is shown.
// Variables: t('Next scan in {h}h', { h: 5 })

import React, { useEffect, useSyncExternalStore } from 'react';
import { MY } from './i18n-my';

export type Lang = 'en' | 'my';

const STORAGE_KEY = 'potentia-lang';
let current: Lang = 'en';
const listeners = new Set<() => void>();

function readStored(): Lang {
try {
const v = window.localStorage.getItem(STORAGE_KEY);
return v === 'my' ? 'my' : 'en';
} catch {
return 'en';
}
}

function applyToDocument(lang: Lang) {
if (typeof document === 'undefined') return;
document.documentElement.lang = lang === 'my' ? 'my' : 'en';
document.documentElement.classList.toggle('lang-my', lang === 'my');
if (lang === 'my' && !document.getElementById('font-myanmar')) {
const link = document.createElement('link');
link.id = 'font-myanmar';
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;500;600;700&display=swap';
document.head.appendChild(link);
}
}

export function setLang(lang: Lang) {
current = lang;
try {
window.localStorage.setItem(STORAGE_KEY, lang);
} catch {
/* private mode: still switches for this session */
}
applyToDocument(lang);
listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
listeners.add(cb);
return () => listeners.delete(cb);
}

let initialised = false;
function init() {
if (initialised || typeof window === 'undefined') return;
initialised = true;
current = readStored();
applyToDocument(current);
}

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>) {
let out = lang === 'my' ? MY[text] ?? text : text;
if (vars) {
for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
}
return out;
}

export function useLang() {
const lang = useSyncExternalStore(
subscribe,
() => {
init();
return current;
},
() => 'en' as Lang,
);
const t = (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
return { lang, t, setLang };
}

/** Small EN / မြန်မာ switch. */
export function LanguageToggle({ className = '' }: { className?: string }) {
const { lang } = useLang();
useEffect(() => init(), []);
return (
<div
className={`flex items-center rounded-full p-0.5 text-[11px] backdrop-blur-md ${className}`}
style={{ background: 'rgb(var(--surface) / 0.7)', border: '1px solid rgb(var(--muted) / 0.2)' }}
>
{(['en', 'my'] as Lang[]).map(l => (
<button
key={l}
onClick={() => setLang(l)}
className="px-2.5 py-1 rounded-full transition-all"
style={{
background: lang === l ? 'rgb(var(--gold))' : 'transparent',
color: lang === l ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: lang === l ? 600 : 400,
}}
>
{l === 'en' ? 'EN' : 'မြန်မာ'}
</button>
))}
</div>
);
}

/** Burmese needs its own font and more line height. Render once (the dashboard does). */
export function LanguageStyles() {
return (
<style>{`
html.lang-my body,
html.lang-my .font-body,
html.lang-my .font-display {
font-family: 'Noto Sans Myanmar', 'Inter', sans-serif !important;
}
html.lang-my p, html.lang-my li, html.lang-my h1, html.lang-my h2, html.lang-my h3 {
line-height: 1.75;
}
html.lang-my .uppercase { letter-spacing: 0.02em !important; }
`}</style>
);
}

