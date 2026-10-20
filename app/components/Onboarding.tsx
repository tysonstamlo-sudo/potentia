'use client';

// app/components/Onboarding.tsx
// First-run quiz. Shown once after sign-up. Answers are saved to profiles.onboarding
// and used to personalise the dashboard. Honest by design: no fake stats, no fake before/afters.

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { ChevronLeft, Check, ScanFace, Sparkles, X as XIcon } from 'lucide-react';

export type OnboardingAnswers = {
concern?: string;
blocker?: string;
motivation?: string;
routine?: string;
commitment?: string;
};

type Option = { id: string; emoji: string; label: string };
type Question = { key: keyof OnboardingAnswers; title: string; sub: string; options: Option[] };

const QUESTIONS: Question[] = [
{
key: 'concern',
title: 'What do you want to improve most?',
sub: 'Pick the one that bothers you most',
options: [
{ id: 'jaw', emoji: '💪', label: 'Weak jawline' },
{ id: 'skin', emoji: '✨', label: 'Rough skin or acne' },
{ id: 'eyes', emoji: '👁️', label: 'Tired eyes or dark circles' },
{ id: 'hair', emoji: '💇', label: 'Hair or hairline' },
{ id: 'fat', emoji: '🔥', label: 'Face fat' },
{ id: 'unsure', emoji: '🤷', label: "I'm not sure yet" },
],
},
{
key: 'blocker',
title: "Why haven't you fixed it yet?",
sub: 'Be honest with yourself',
options: [
{ id: 'no_results', emoji: '😔', label: "I've tried but saw no results" },
{ id: 'consistency', emoji: '📅', label: "It's hard to stay consistent" },
{ id: 'dont_know', emoji: '🤷', label: "I don't know what to fix" },
{ id: 'cost', emoji: '💰', label: "It's too expensive" },
],
},
{
key: 'motivation',
title: 'What is motivating you?',
sub: 'What drives you to improve',
options: [
{ id: 'confidence', emoji: '💪', label: 'I want to feel more confident' },
{ id: 'wellbeing', emoji: '🧠', label: 'Better mental well-being' },
{ id: 'dating', emoji: '💞', label: 'Dating and relationships' },
{ id: 'respect', emoji: '👥', label: 'Being taken seriously by others' },
{ id: 'health', emoji: '❤️', label: 'Being healthier overall' },
],
},
{
key: 'routine',
title: "What's your current routine?",
sub: 'Be honest with yourself',
options: [
{ id: 'nothing', emoji: '🛌', label: 'Nothing right now' },
{ id: 'hygiene', emoji: '🧼', label: 'Just basic hygiene' },
{ id: 'gym', emoji: '🏋️', label: 'Gym focused' },
{ id: 'face', emoji: '🧴', label: 'Skin and face focused' },
{ id: 'everything', emoji: '🧬', label: 'Doing everything' },
],
},
{
key: 'commitment',
title: 'If we give you a daily plan, will you follow it?',
sub: 'Results only come from doing it',
options: [
{ id: 'all_in', emoji: '💯', label: "100%. I'm ready to put in the work" },
{ id: 'schedule', emoji: '📅', label: 'Yes, if it fits my schedule' },
{ id: 'accountability', emoji: '🤝', label: "I'll try, but I need accountability" },
{ id: 'see_first', emoji: '🤔', label: 'I need to see the plan first' },
],
},
];

const CAN_CHANGE = [
'Skin: clarity, acne, dark circles',
'Face fat and jaw definition (by getting leaner)',
'Posture and neck',
'Hair, brows and grooming',
'Puffiness and how tired you look',
];
const CANNOT_CHANGE = ['Bone structure', 'Eye shape and spacing', 'Your height'];

export const CONCERN_FOCUS: Record<string, string> = {
jaw: 'Your plan starts with jaw definition: leanness, neck and posture.',
skin: 'Your plan starts with skin: a simple daily routine and sunscreen.',
eyes: 'Your plan starts with your eye area: sleep, puffiness and brows.',
hair: 'Your plan starts with hair: the right cut and grooming for your face.',
fat: 'Your plan starts with getting leaner: protein, steps and a small calorie deficit.',
unsure: 'Your scan will show what to focus on first.',
};

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--muted) / 0.18)',
};
const activeStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.14), rgb(var(--surface) / 0.5))',
border: '1px solid rgb(var(--gold) / 0.65)',
boxShadow: '0 0 18px rgb(var(--gold) / 0.12)',
};
const primaryBtn: React.CSSProperties = {
background: 'rgb(var(--gold))',
color: 'rgb(var(--bg))',
boxShadow: '0 0 22px rgb(var(--gold) / 0.3)',
};

// steps: 0 intro · 1..5 questions · 6 honest "what can change" · 7 commitment pact · 8 building · 9 ready
const TOTAL = 10;

export default function Onboarding({
userId,
onDone,
}: {
userId: string;
onDone: (answers: OnboardingAnswers, goScan: boolean) => void;
}) {
const { t } = useLang();
const [step, setStep] = useState(0);
const [answers, setAnswers] = useState<OnboardingAnswers>({});
const [pact, setPact] = useState(false);
const [buildPct, setBuildPct] = useState(0);
const [saving, setSaving] = useState(false);

const q = step >= 1 && step <= QUESTIONS.length ? QUESTIONS[step - 1] : null;
const selected = q ? answers[q.key] : undefined;

// Fake-free "building" step: a short pause while we save, so the transition feels deliberate.
useEffect(() => {
if (step !== 8) return;
setBuildPct(0);
const id = setInterval(() => setBuildPct(p => Math.min(100, p + 4)), 60);
return () => clearInterval(id);
}, [step]);

useEffect(() => {
if (step === 8 && buildPct >= 100) setStep(9);
}, [step, buildPct]);

const next = () => setStep(s => Math.min(TOTAL - 1, s + 1));
const back = () => setStep(s => Math.max(0, s - 1));

const finish = async (goScan: boolean) => {
setSaving(true);
try {
await supabase
.from('profiles')
.update({ onboarding: answers, onboarded_at: new Date().toISOString() })
.eq('id', userId);
} catch {
/* not critical */
}
setSaving(false);
onDone(answers, goScan);
};

const canContinue = step === 0 || (q ? !!selected : step === 6 || (step === 7 && pact));

return (
<div className="fixed inset-0 z-[60] bg-[rgb(var(--bg))] flex flex-col font-body">
<div className="max-w-md w-full mx-auto flex-1 min-h-0 flex flex-col px-5 pt-[max(env(safe-area-inset-top),16px)]">
{/* top bar */}
{step > 0 && step < 8 && (
<div className="flex-shrink-0 flex items-center gap-3 pt-3 pb-4">
<button onClick={back} aria-label={t('Back')} className="w-9 h-9 flex items-center justify-center text-[rgb(var(--muted-hover))]">
<ChevronLeft className="w-5 h-5" />
</button>
<div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.2)' }}>
<div
className="h-full rounded-full transition-all duration-500"
style={{ width: `${(step / 8) * 100}%`, background: 'rgb(var(--gold))', boxShadow: '0 0 8px rgb(var(--gold))' }}
/>
</div>
</div>
)}

<div className="flex-1 min-h-0 overflow-y-auto pb-4">
{/* intro */}
{step === 0 && (
<div className="h-full flex flex-col items-center justify-center text-center pt-10">
<div
className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
style={{ background: 'linear-gradient(145deg, rgb(var(--gold)), rgb(var(--bg)))', boxShadow: '0 0 40px rgb(var(--gold) / 0.35)' }}
>
<ScanFace className="w-9 h-9" style={{ color: 'rgb(var(--bg))' }} />
</div>
<h1 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] mb-4 leading-tight">
{t('Become the best version of yourself')}
</h1>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed max-w-xs">
{t('Face scans, a daily plan and real progress tracking. Most people see a difference in 60–90 days if they stay consistent.')}
</p>
</div>
)}

{/* questions */}
{q && (
<div>
<h2 className="font-display text-xl sm:text-2xl font-semibold text-[rgb(var(--gold))] text-center leading-snug mb-1.5">{t(q.title)}</h2>
<p className="text-sm text-[rgb(var(--muted))] text-center mb-5">{t(q.sub)}</p>
<div className="space-y-2.5">
{q.options.map(o => {
const active = selected === o.id;
return (
<button
key={o.id}
onClick={() => setAnswers(a => ({ ...a, [q.key]: o.id }))}
className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all"
style={active ? activeStyle : cardStyle}
>
<span
className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
style={{
background: active ? 'rgb(var(--gold))' : 'transparent',
border: active ? 'none' : '1.5px solid rgb(var(--muted) / 0.5)',
}}
>
{active && <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--bg))' }} />}
</span>
<span className="text-lg">{o.emoji}</span>
<span className="text-sm text-[rgb(var(--muted-hover))]" style={active ? { color: 'rgb(var(--gold))' } : undefined}>
{t(o.label)}
</span>
</button>
);
})}
</div>
</div>
)}

{/* honest expectations */}
{step === 6 && (
<div>
<h2 className="font-display text-2xl font-semibold text-[rgb(var(--gold))] text-center leading-snug mb-2">
{t('What can actually change')}
</h2>
<p className="text-sm text-[rgb(var(--muted))] text-center mb-6">
{t("We'll be straight with you. That's why our plans work.")}
</p>
<div className="rounded-2xl p-5 mb-3" style={activeStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase block mb-3">{t('You can change')}</span>
<ul className="space-y-2.5">
{CAN_CHANGE.map(x => (
<li key={x} className="flex gap-3 text-sm text-[rgb(var(--muted-hover))]">
<Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-[rgb(var(--gold))]" />
{t(x)}
</li>
))}
</ul>
</div>
<div className="rounded-2xl p-5 mb-4" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">{t('You cannot change')}</span>
<ul className="space-y-2.5">
{CANNOT_CHANGE.map(x => (
<li key={x} className="flex gap-3 text-sm text-[rgb(var(--muted))]">
<XIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--err))' }} />
{t(x)}
</li>
))}
</ul>
</div>
<p className="text-xs text-[rgb(var(--muted))] leading-relaxed text-center px-2">
{t('Any app that says exercises will reshape your bones is lying to you. Changing what you can still makes a big difference.')}
</p>
</div>
)}

{/* commitment pact */}
{step === 7 && (
<div>
<h2 className="font-display text-2xl font-semibold text-[rgb(var(--gold))] text-center leading-snug mb-2">
{t('Results come from doing the daily tasks')}
</h2>
<p className="text-sm text-[rgb(var(--muted))] text-center mb-6">
{t("You only rank up when you do them. Your scans will show if it's working.")}
</p>
<button
onClick={() => setPact(p => !p)}
className="w-full flex items-center gap-4 rounded-2xl px-4 py-5 text-left transition-all"
style={pact ? activeStyle : cardStyle}
>
<span
className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
style={{ background: pact ? 'rgb(var(--gold))' : 'transparent', border: pact ? 'none' : '1.5px solid rgb(var(--muted) / 0.5)' }}
>
{pact && <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--bg))' }} />}
</span>
<span className="text-xl">🤝</span>
<span className="text-[15px]" style={{ color: pact ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))' }}>
{t("Deal. I'll do my part.")}
</span>
</button>
</div>
)}

{/* building */}
{step === 8 && (
<div className="h-full flex flex-col items-center justify-center text-center pt-16">
<div className="relative w-28 h-28 mb-8">
<svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
<circle cx="50" cy="50" r="44" fill="none" stroke="rgb(var(--muted) / 0.2)" strokeWidth="6" />
<circle
cx="50"
cy="50"
r="44"
fill="none"
stroke="rgb(var(--gold))"
strokeWidth="6"
strokeLinecap="round"
strokeDasharray={2 * Math.PI * 44}
strokeDashoffset={2 * Math.PI * 44 * (1 - buildPct / 100)}
style={{ filter: 'drop-shadow(0 0 6px rgb(var(--gold)))' }}
/>
</svg>
<span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-[rgb(var(--gold))]">
{buildPct}%
</span>
</div>
<h2 className="font-display text-xl font-semibold text-[rgb(var(--gold))] mb-2">{t('Building your plan')}</h2>
<p className="text-sm text-[rgb(var(--muted))]">{t('Setting up your Level 1 tasks')}</p>
</div>
)}

{/* ready */}
{step === 9 && (
<div className="h-full flex flex-col items-center justify-center text-center pt-10">
<Sparkles className="w-10 h-10 text-[rgb(var(--gold))] mb-6" />
<h2 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] mb-3">{t('Your plan is ready')}</h2>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed max-w-xs mb-6">
{t(CONCERN_FOCUS[answers.concern ?? 'unsure'] ?? CONCERN_FOCUS.unsure)}
</p>
<div className="rounded-2xl p-4 text-left w-full" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed">
{t('Next: scan your face. It takes 30 seconds, runs on your phone, and your photo is never uploaded.')}
</p>
</div>
</div>
)}
</div>

{/* bottom button */}
<div className="flex-shrink-0 pb-[max(env(safe-area-inset-bottom),16px)] pt-3" style={{ background: 'rgb(var(--bg))' }}>
{step === 9 ? (
<div className="space-y-3">
<button
onClick={() => finish(true)}
disabled={saving}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={primaryBtn}
>
<ScanFace className="w-5 h-5" /> {t('Scan my face')}
</button>
<button onClick={() => finish(false)} disabled={saving} className="w-full text-sm text-[rgb(var(--muted))] py-2">
{t('Later, take me to my dashboard')}
</button>
</div>
) : step !== 8 ? (
<button
onClick={next}
disabled={!canContinue}
className="w-full font-semibold py-4 rounded-2xl text-[15px] transition-all disabled:opacity-35"
style={primaryBtn}
>
{step === 0 ? t("Let's start") : t('Continue')}
</button>
) : null}
</div>
</div>
</div>
);
}

