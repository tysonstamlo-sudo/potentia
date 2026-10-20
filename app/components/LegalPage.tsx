'use client';

// app/components/LegalPage.tsx — shared layout for /privacy and /terms

import React from 'react';
import Link from 'next/link';
import { ThemeStyles, ThemeToggle, MarbleBackground } from '../../lib/theme';
import { useLang, LanguageToggle, LanguageStyles } from '../../lib/i18n';
import { ChevronLeft } from 'lucide-react';

// >>> Put your real contact details here before launch <<<
export const CONTACT_EMAIL = 'tysonstamlo@gmail.com';
export const CONTACT_OTHER = 'Telegram / Viber: 09943650553';
export const LAST_UPDATED = '21 October 2026';

export type Section = { title: string; body: (string | string[])[] };

export default function LegalPage({
title,
summaryMy,
sections,
}: {
title: string;
summaryMy: string;
sections: Section[];
}) {
const { t, lang } = useLang();

return (
<div className="min-h-screen bg-[rgb(var(--bg))] relative overflow-x-hidden font-body">
<ThemeStyles />
<LanguageStyles />
<MarbleBackground />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }
`}</style>
<ThemeToggle className="fixed top-4 right-4 z-40" />
<LanguageToggle className="fixed top-4 right-16 z-40" />

<div className="relative z-10 max-w-2xl mx-auto px-5 pt-6 pb-20">
<Link href="/" className="inline-flex items-center gap-1 text-sm text-[rgb(var(--muted-hover))] mb-8">
<ChevronLeft className="w-4 h-4" /> {t('Back')}
</Link>

<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-2">Potentia</span>
<h1 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] mb-2">{t(title)}</h1>
<p className="text-xs text-[rgb(var(--muted))] mb-8">
{t('Last updated')}: {LAST_UPDATED}
</p>

{lang === 'my' && (
<div
className="rounded-2xl p-5 mb-8"
style={{
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))',
border: '1px solid rgb(var(--gold) / 0.25)',
}}
>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-2">အကျဉ်းချုပ်</span>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed whitespace-pre-line">{summaryMy}</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-3">
အပြည့်အစုံကို အင်္ဂလိပ်လို အောက်မှာ ဖော်ပြထားပါတယ်။ အင်္ဂလိပ်ဗားရှင်းကို အတည်ယူပါမယ်။
</p>
</div>
)}

<div className="space-y-8">
{sections.map((s, i) => (
<section key={s.title}>
<h2 className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-3">
{i + 1}. {s.title}
</h2>
<div className="space-y-3">
{s.body.map((b, j) =>
Array.isArray(b) ? (
<ul key={j} className="space-y-2 pl-1">
{b.map(li => (
<li key={li} className="flex gap-2.5 text-sm text-[rgb(var(--muted-hover))] leading-relaxed">
<span className="text-[rgb(var(--gold))]">•</span>
<span>{li}</span>
</li>
))}
</ul>
) : (
<p key={j} className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">
{b}
</p>
),
)}
</div>
</section>
))}
</div>

<div className="mt-12 pt-6 flex gap-5 text-xs" style={{ borderTop: '1px solid rgb(var(--muted) / 0.15)' }}>
<Link href="/privacy" className="text-[rgb(var(--gold))]">{t('Privacy Policy')}</Link>
<Link href="/terms" className="text-[rgb(var(--gold))]">{t('Terms of Use')}</Link>
</div>
</div>
</div>
);
}

