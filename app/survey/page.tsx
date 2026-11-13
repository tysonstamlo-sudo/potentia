'use client';

// app/survey/page.tsx — public interest survey (no login). Open it with the QR code or the link /survey.
// Answers are saved to the survey_responses table (see survey.sql). Results: Supabase -> survey_results.

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, MarbleBackground } from '../../lib/theme';
import { useLang, LanguageToggle, LanguageStyles } from '../../lib/i18n';
import { LOGO_SRC } from '../../lib/logo';
import { Check, Loader2 } from 'lucide-react';

type Opt = { v: string; en: string; my: string };
type Q = {
id: string;
kind: 'one' | 'many' | 'scale' | 'text';
en: string;
my: string;
opts?: Opt[];
/** scale labels for 1 and 5 */
low?: [string, string];
high?: [string, string];
optional?: boolean;
};
type Block = { en: string; my: string; note?: [string, string]; qs: Q[] };

const o = (v: string, en: string, my: string): Opt => ({ v, en, my });
const YES_MAYBE_NO = [o('yes', 'Yes', 'ဝယ်မယ်'), o('maybe', 'Maybe', 'ဖြစ်နိုင်တယ်'), o('no', 'No', 'မဝယ်ဘူး')];

const BLOCKS: Block[] = [
{
en: 'About you',
my: 'သင့်အကြောင်း',
qs: [
{ id: 'q1_age', kind: 'one', en: 'Your age', my: 'သင့်အသက်', opts: [o('18-20', '18–20', '၁၈–၂၀'), o('21-24', '21–24', '၂၁–၂၄'), o('25-30', '25–30', '၂၅–၃၀'), o('30+', '30+', '၃၀ အထက်')] },
{
id: 'q2_gender',
kind: 'one',
en: 'Gender',
my: 'ကျား / မ',
opts: [o('male', 'Male', 'ကျား'), o('female', 'Female', 'မ'), o('na', 'Prefer not to say', 'မပြောလိုပါ')],
},
],
},
{
en: 'Your looks',
my: 'သင့်ရုပ်ရည်',
qs: [
{
id: 'q3_care',
kind: 'scale',
en: 'How much do you care about improving your appearance?',
my: 'ကိုယ့်ရုပ်ရည် ပိုကောင်းလာဖို့ ဘယ်လောက် ဂရုစိုက်လဲ?',
low: ['Not at all', 'လုံးဝ မစိုက်'],
high: ['A lot', 'အရမ်းစိုက်'],
},
{
id: 'q4_now',
kind: 'many',
en: 'What do you do now to improve it? (pick all that apply)',
my: 'အခု ဘာတွေ လုပ်နေလဲ? (ရှိသမျှ ရွေးပါ)',
opts: [
o('skincare', 'Skincare', 'Skincare'),
o('gym', 'Gym', 'Gym'),
o('diet', 'Diet', 'အစားအသောက် ထိန်း'),
o('grooming', 'Grooming or hair', 'ဆံပင် / သန့်ရှင်းသပ်ရပ်မှု'),
o('videos', 'Watch videos for tips', 'Video တွေ ကြည့်ပြီး လေ့လာ'),
o('nothing', 'Nothing', 'ဘာမှ မလုပ်'),
],
},
{
id: 'q5_hard',
kind: 'one',
en: 'What is hardest about it?',
my: 'ဘာက အခက်ဆုံးလဲ?',
opts: [
o('what', 'I don’t know what to work on', 'ဘာကို ပြင်ရမလဲ မသိ'),
o('products', 'I don’t know which products to buy', 'ဘယ်ပစ္စည်း ဝယ်ရမလဲ မသိ'),
o('consistency', 'I can’t stay consistent', 'ပုံမှန် မလုပ်နိုင်'),
o('cost', 'It costs too much', 'ကုန်ကျစရိတ် များ'),
o('other', 'Other', 'အခြား'),
],
},
],
},
{
en: 'The idea',
my: 'အိုင်ဒီယာ',
note: [
'Potentia is an app that scans your face with your phone camera, gives you a score, shows your weak points, and gives you a plan and product suggestions to improve.',
'Potentia ဆိုတာ ဖုန်းကင်မရာနဲ့ မျက်နှာကို scan ဖတ်ပြီး အမှတ်ပေး၊ အားနည်းချက်တွေ ပြကာ ပိုကောင်းလာဖို့ plan နဲ့ ပစ္စည်း အကြံပြုချက်တွေ ပေးတဲ့ app ပါ။',
],
qs: [
{
id: 'q6_interest',
kind: 'scale',
en: 'How interested are you in trying this?',
my: 'စမ်းသုံးကြည့်ဖို့ ဘယ်လောက် စိတ်ဝင်စားလဲ?',
low: ['Not at all', 'လုံးဝ မဝင်စား'],
high: ['Very', 'အရမ်း ဝင်စား'],
},
{
id: 'q7_useful',
kind: 'one',
en: 'Which part is most useful to you?',
my: 'ဘယ်အပိုင်းက သင့်အတွက် အသုံးအဝင်ဆုံးလဲ?',
opts: [
o('score', 'Face score', 'မျက်နှာ အမှတ်'),
o('weak', 'Weak points', 'အားနည်းချက်များ'),
o('plan', 'Step-by-step plan', 'တစ်ဆင့်ချင်း plan'),
o('skin', 'Skin analysis', 'အသားအရေ စစ်ဆေးမှု'),
o('products', 'Product suggestions', 'ပစ္စည်း အကြံပြုချက်'),
o('photos', 'Progress photos', 'တိုးတက်မှု ဓာတ်ပုံ'),
o('ranking', 'Ranking against others', 'တခြားသူတွေနဲ့ အဆင့်ပြိုင်'),
],
},
{
id: 'q8_stop',
kind: 'one',
en: 'What would stop you from using it?',
my: 'ဘာကြောင့် မသုံးဖြစ်နိုင်လဲ?',
opts: [
o('privacy', 'Privacy of my face photos', 'မျက်နှာဓာတ်ပုံ လုံခြုံမှု'),
o('trust', 'I don’t trust the score', 'အမှတ်ကို မယုံ'),
o('feelbad', 'I might feel bad about my score', 'အမှတ်ကြောင့် စိတ်မကောင်းဖြစ်မှာ စိုး'),
o('notinterested', 'Not interested', 'စိတ်မဝင်စား'),
o('nothing', 'Nothing', 'ဘာမှ မရှိ'),
],
},
],
},
{
en: 'Money',
my: 'ငွေကြေး',
qs: [
{
id: 'q9_pay',
kind: 'one',
en: 'Would you pay for full results?',
my: 'ရလဒ်အပြည့်အစုံအတွက် ငွေပေးမလား?',
opts: [o('yes', 'Yes', 'ပေးမယ်'), o('maybe', 'Maybe', 'ဖြစ်နိုင်တယ်'), o('no', 'No', 'မပေးဘူး')],
},
{
id: 'q10_price',
kind: 'one',
en: 'What is the most you would pay for one month?',
my: 'တစ်လအတွက် အများဆုံး ဘယ်လောက် ပေးမလဲ?',
opts: [
o('0', 'Nothing', 'မပေးပါ'),
o('<50', 'Under 50 THB', '၅၀ ဘတ်အောက်'),
o('50-100', '50–100 THB', '၅၀–၁၀၀ ဘတ်'),
o('100-200', '100–200 THB', '၁၀၀–၂၀၀ ဘတ်'),
o('200+', '200+ THB', '၂၀၀ ဘတ်အထက်'),
],
},
{ id: 'q11_buy', kind: 'one', en: 'Would you buy a product the app suggested for your skin?', my: 'App က အသားအရေအတွက် အကြံပြုတဲ့ ပစ္စည်းကို ဝယ်မလား?', opts: YES_MAYBE_NO },
],
},
{
en: 'Last one',
my: 'နောက်ဆုံး',
qs: [
{
id: 'q12_wish',
kind: 'text',
optional: true,
en: 'Anything you would want from an app like this? (optional)',
my: 'ဒီလို app မျိုးကနေ ဘာလိုချင်လဲ? (မဖြေလည်းရ)',
},
],
},
];

const ALL = BLOCKS.flatMap(b => b.qs);
const DONE_KEY = 'potentia_survey_done';

type Answers = Record<string, string | string[] | number>;

export default function SurveyPage() {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [a, setA] = useState<Answers>({});
const [busy, setBusy] = useState(false);
const [done, setDone] = useState(false);
const [error, setError] = useState('');

useEffect(() => {
try {
if (localStorage.getItem(DONE_KEY)) setDone(true);
} catch {
/* ignore */
}
}, []);

const set = (id: string, v: string | number) => setA(cur => ({ ...cur, [id]: v }));
const toggle = (id: string, v: string) =>
setA(cur => {
const list = Array.isArray(cur[id]) ? (cur[id] as string[]) : [];
return { ...cur, [id]: list.includes(v) ? list.filter(x => x !== v) : [...list, v] };
});

const answered = (q: Q) => {
const v = a[q.id];
if (q.optional) return true;
if (q.kind === 'many') return Array.isArray(v) && v.length > 0;
return v !== undefined && v !== '';
};
const left = ALL.filter(q => !answered(q)).length;

const send = async () => {
if (busy) return;
if (left > 0) return setError(L(`Please answer ${left} more question(s).`, `မေးခွန်း ${left} ခု ကျန်ပါသေးတယ်။`));
setBusy(true);
setError('');
const clean: Answers = { ...a };
if (typeof clean.q12_wish === 'string') clean.q12_wish = clean.q12_wish.trim().slice(0, 500);
if (!clean.q12_wish) delete clean.q12_wish;
const { error: err } = await supabase.from('survey_responses').insert({ lang, answers: clean });
setBusy(false);
if (err) {
console.error('survey save failed', err);
return setError(L('Could not send. Check your internet and try again.', 'ပို့လို့ မရပါ။ အင်တာနက် စစ်ပြီး ပြန်ကြိုးစားပါ။'));
}
try {
localStorage.setItem(DONE_KEY, '1');
} catch {
/* ignore */
}
setDone(true);
window.scrollTo({ top: 0 });
};

const card: React.CSSProperties = { background: 'rgb(var(--surface) / 0.6)', border: '1px solid rgb(var(--muted) / 0.16)' };
const chip = (active: boolean): React.CSSProperties => ({
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
border: `1px solid ${active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.2)'}`,
fontWeight: active ? 600 : 400,
});

return (
<div className="min-h-screen relative" style={{ background: 'rgb(var(--bg))' }}>
<ThemeStyles />
<LanguageStyles />
<MarbleBackground />
<div className="relative max-w-md mx-auto px-5 py-8 font-body">
<div className="flex justify-end mb-4">
<LanguageToggle />
</div>
<div className="flex flex-col items-center text-center mb-6">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={LOGO_SRC} alt="Potentia" style={{ height: 56, width: 'auto' }} className="mb-3" />
<h1 className="font-display text-2xl font-semibold text-[rgb(var(--gold))]">{L('2-minute survey', '၂ မိနစ် စစ်တမ်း')}</h1>
{!done && (
<p className="text-xs text-[rgb(var(--muted-hover))] mt-2 leading-relaxed">
{L(
'We are students researching an idea for a self-improvement app. Your answers are anonymous. No name, no login.',
'ကျွန်ုပ်တို့က ကိုယ့်ကိုယ်ကို တိုးတက်စေမယ့် app အိုင်ဒီယာတစ်ခုကို လေ့လာနေတဲ့ ကျောင်းသားတွေပါ။ သင့်အဖြေတွေက အမည်မဖော်ပါ။ နာမည်၊ login မလိုပါ။'
)}
</p>
)}
</div>

{done ? (
<div className="rounded-3xl p-8 text-center" style={card}>
<span className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgb(var(--gold) / 0.15)' }}>
<Check className="w-7 h-7 text-[rgb(var(--gold))]" />
</span>
<h2 className="font-display text-xl font-semibold text-[rgb(var(--gold))] mb-2">{L('Thank you!', 'ကျေးဇူးတင်ပါတယ်!')}</h2>
<p className="text-sm text-[rgb(var(--muted-hover))] leading-relaxed mb-6">{L('Your answers were saved.', 'သင့်အဖြေတွေကို သိမ်းပြီးပါပြီ။')}</p>
<a href="/" className="inline-block font-medium py-3 px-6 rounded-xl text-[13px]" style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}>
{L('Want to try the app?', 'App ကို စမ်းကြည့်မလား?')} →
</a>
</div>
) : (
<div className="space-y-5">
{BLOCKS.map(b => (
<div key={b.en} className="rounded-3xl p-5" style={card}>
<span className="text-[10px] tracking-[0.25em] text-[rgb(var(--muted))] uppercase block mb-3">{L(b.en, b.my)}</span>
{b.note && (
<p className="text-[13px] leading-relaxed text-[rgb(var(--muted-hover))] rounded-2xl p-4 mb-4" style={{ background: 'rgb(var(--gold) / 0.08)', border: '1px solid rgb(var(--gold) / 0.25)' }}>
{L(b.note[0], b.note[1])}
</p>
)}
<div className="space-y-6">
{b.qs.map(q => (
<div key={q.id}>
<p className="text-sm text-[rgb(var(--gold))] font-medium mb-3 leading-snug">{L(q.en, q.my)}</p>
{(q.kind === 'one' || q.kind === 'many') && (
<div className="flex flex-wrap gap-2">
{q.opts!.map(op => {
const active = q.kind === 'one' ? a[q.id] === op.v : Array.isArray(a[q.id]) && (a[q.id] as string[]).includes(op.v);
return (
<button
key={op.v}
type="button"
onClick={() => (q.kind === 'one' ? set(q.id, op.v) : toggle(q.id, op.v))}
className="text-[13px] rounded-full px-4 py-2.5 text-left"
style={chip(active)}
>
{L(op.en, op.my)}
</button>
);
})}
</div>
)}
{q.kind === 'scale' && (
<div>
<div className="grid grid-cols-5 gap-2">
{[1, 2, 3, 4, 5].map(n => (
<button key={n} type="button" onClick={() => set(q.id, n)} className="rounded-xl py-3 text-sm" style={chip(a[q.id] === n)}>
{n}
</button>
))}
</div>
<div className="flex justify-between text-[10px] text-[rgb(var(--muted))] mt-1.5">
<span>{L(q.low![0], q.low![1])}</span>
<span>{L(q.high![0], q.high![1])}</span>
</div>
</div>
)}
{q.kind === 'text' && (
<textarea
value={(a[q.id] as string) ?? ''}
onChange={e => set(q.id, e.target.value)}
maxLength={500}
rows={3}
className="w-full rounded-2xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={{ background: 'rgb(var(--surface) / 0.6)', border: '1px solid rgb(var(--muted) / 0.2)', fontSize: 16 }}
/>
)}
</div>
))}
</div>
</div>
))}

{error && (
<p className="text-center text-xs" style={{ color: 'rgb(var(--err))' }}>
{error}
</p>
)}
<button
onClick={send}
disabled={busy}
className="w-full flex items-center justify-center gap-2 font-medium py-4 rounded-2xl text-sm disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {L('Send my answers', 'အဖြေတွေ ပို့မယ်')}
</button>
</div>
)}
</div>
</div>
);
}

