'use client';

// app/components/SaveAccount.tsx — a guest saves their account and keeps their scans.
// Step 1: username, email, phone -> we email a link. Step 2 (after tapping the link): set a password.

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { checkEmail } from '../../lib/emailCheck';
import { Sheet } from './shopShared';
import { Loader2, MailCheck, Check } from 'lucide-react';

const input: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.2)',
fontSize: 16,
};

export default function SaveAccount({
userId,
step: startStep = 'form',
reason,
onClose,
}: {
userId: string;
/** 'password' when they come back from the email link */
step?: 'form' | 'password';
/** why we are asking, shown at the top (e.g. "To pay, save your account first.") */
reason?: string;
onClose: () => void;
}) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [step, setStep] = useState<'form' | 'sent' | 'password' | 'done'>(startStep);
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [password, setPassword] = useState('');
const [fix, setFix] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');

const sendLink = async () => {
setError('');
setFix(null);
const clean = name.trim().replace(/\s+/g, ' ');
if (clean.length < 2 || clean.length > 30) return setError(L('Username must be 2 to 30 characters.', 'အသုံးပြုသူအမည် စာလုံး ၂ မှ ၃၀ ဖြစ်ရပါမယ်။'));
const mail = email.trim().toLowerCase();
const chk = checkEmail(mail);
if (!chk.ok) {
if (chk.reason === 'typo') {
setFix(chk.suggestion);
return setError(L('Check your email address. It looks mistyped.', 'အီးမေးလ် စာလုံးပေါင်း မှားနေပုံရပါတယ်။'));
}
return setError(chk.reason === 'blocked' ? L('Please use your real email.', 'သင့်အီးမေးလ်အစစ်ကို သုံးပါ။') : L('That email address doesn’t look right.', 'အီးမေးလ်လိပ်စာ မှန်မမှန် စစ်ပါ။'));
}
const ph = phone.replace(/[^0-9+]/g, '');
if (!/^\+?[0-9]{7,15}$/.test(ph)) return setError(L('Enter your phone number, for example 09xxxxxxxxx.', 'ဖုန်းနံပါတ် ထည့်ပါ။ ဥပမာ 09xxxxxxxxx'));

setBusy(true);
const { error: nameErr } = await supabase.from('profiles').update({ username: clean }).eq('id', userId);
if (nameErr) {
setBusy(false);
const taken = nameErr.code === '23505' || /duplicate|unique/i.test(nameErr.message);
return setError(taken ? L('That username is taken. Try another.', 'ဒီအမည်ကို တခြားသူ သုံးပြီးသားပါ။') : nameErr.message);
}
await supabase.rpc('set_my_phone', { p: ph });
const { error: mailErr } = await supabase.auth.updateUser({ email: mail }, { emailRedirectTo: `${window.location.origin}/?finish=account` });
setBusy(false);
if (mailErr) {
const m = mailErr.message.toLowerCase();
return setError(
m.includes('already')
? L('This email already has an account. Log out and log in with it instead.', 'ဒီအီးမေးလ်နဲ့ အကောင့်ရှိပြီးသားပါ။ ထွက်ပြီး အဲဒီအကောင့်နဲ့ ဝင်ပါ။')
: m.includes('rate') || m.includes('too many')
? L('Too many emails right now. Try again in a few minutes.', 'ခဏအတွင်း အီးမေးလ် များလွန်းနေပါတယ်။ မိနစ်အနည်းငယ်နေ ပြန်ကြိုးစားပါ။')
: mailErr.message
);
}
setStep('sent');
};

const savePassword = async () => {
setError('');
if (password.length < 6) return setError(L('Password must be at least 6 characters.', 'စကားဝှက် အနည်းဆုံး ၆ လုံး ရှိရပါမယ်။'));
setBusy(true);
const { error: err } = await supabase.auth.updateUser({ password });
setBusy(false);
if (err) return setError(err.message);
setStep('done');
setTimeout(() => {
window.location.href = '/';
}, 1200);
};

return (
<Sheet onClose={onClose} title={L('Save my account', 'အကောင့် သိမ်းမယ်')}>
<div className="space-y-4 font-body">
{step === 'form' && (
<>
{reason && (
<p className="text-[13px] rounded-xl px-4 py-3" style={{ background: 'rgb(var(--gold) / 0.1)', color: 'rgb(var(--gold))' }}>
{reason}
</p>
)}
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-relaxed">
{L('Your scans, score and progress stay. You can log in on any phone after this.', 'သင့် scan တွေ၊ အမှတ်နဲ့ တိုးတက်မှုတွေ မပျောက်ပါ။ ပြီးရင် ဘယ်ဖုန်းကနေမဆို ဝင်နိုင်ပါမယ်။')}
</p>
{(
[
[L('Username', 'အသုံးပြုသူအမည်'), name, setName, 'text', 'nickname', 'Marcus'],
[L('Email', 'အီးမေးလ်'), email, setEmail, 'email', 'email', 'you@email.com'],
[L('Phone number', 'ဖုန်းနံပါတ်'), phone, setPhone, 'tel', 'tel', '09xxxxxxxxx'],
] as const
).map(([label, value, set, type, auto, ph]) => (
<label key={label} className="block">
<span className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{label}</span>
<input
type={type}
value={value}
onChange={e => set(e.target.value)}
autoComplete={auto}
autoCapitalize="none"
placeholder={ph}
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={input}
/>
</label>
))}
{fix && (
<button
type="button"
onClick={() => {
setEmail(fix);
setFix(null);
setError('');
}}
className="w-full text-left text-[12px] font-medium rounded-xl px-3 py-2.5"
style={{ background: 'rgb(var(--gold) / 0.12)', color: 'rgb(var(--gold))' }}
>
{L('Did you mean', 'ဒီလိပ်စာလား')} <b>{fix}</b>? {L('Tap to fix.', 'နှိပ်ပြီး ပြင်ပါ။')}
</button>
)}
{error && <p className="text-xs" style={{ color: 'rgb(var(--err))' }}>{error}</p>}
<button
onClick={sendLink}
disabled={busy}
className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy && <Loader2 className="w-4 h-4 animate-spin" />} {L('Continue', 'ဆက်လုပ်မယ်')}
</button>
</>
)}

{step === 'sent' && (
<div className="text-center py-4">
<span className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
<MailCheck className="w-7 h-7 text-[rgb(var(--gold))]" />
</span>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{L('Check your email', 'အီးမေးလ် စစ်ပါ')}</p>
<p className="text-[13px] text-[rgb(var(--muted-hover))] mt-2 leading-relaxed">
{L(
`We sent a link to ${email.trim()}. Tap it on this phone, then set your password. Check Spam too.`,
`${email.trim()} ကို လင့်ခ် ပို့ထားပါတယ်။ ဒီဖုန်းမှာ နှိပ်ပြီး စကားဝှက် သတ်မှတ်ပါ။ Spam ကိုလည်း စစ်ပါ။`
)}
</p>
</div>
)}

{step === 'password' && (
<>
<p className="text-[13px] text-[rgb(var(--muted-hover))]">{L('Email confirmed. Last step: choose a password.', 'အီးမေးလ် အတည်ပြုပြီးပါပြီ။ နောက်ဆုံးအဆင့်: စကားဝှက် ရွေးပါ။')}</p>
<label className="block">
<span className="text-[11px] text-[rgb(var(--muted))] block mb-1.5">{L('Password', 'စကားဝှက်')}</span>
<input
type="password"
value={password}
onChange={e => setPassword(e.target.value)}
autoComplete="new-password"
className="w-full rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={input}
/>
</label>
{error && <p className="text-xs" style={{ color: 'rgb(var(--err))' }}>{error}</p>}
<button
onClick={savePassword}
disabled={busy}
className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy && <Loader2 className="w-4 h-4 animate-spin" />} {L('Save my account', 'အကောင့် သိမ်းမယ်')}
</button>
</>
)}

{step === 'done' && (
<div className="text-center py-6">
<Check className="w-8 h-8 mx-auto mb-2 text-[rgb(var(--gold))]" />
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))]">{L('Account saved', 'အကောင့် သိမ်းပြီးပါပြီ')}</p>
</div>
)}
</div>
</Sheet>
);
}

