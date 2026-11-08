'use client';

// app/login/page.tsx — log in, sign up, forgot password.
// The profile is created by Supabase itself (signup-fix.sql), so sign-up can't half-fail any more.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground, MarbleImage } from '../../lib/theme';
import { useLang, LanguageToggle, LanguageStyles } from '../../lib/i18n';
import { LOGO_SRC } from '../../lib/logo';
import { Mail, Lock, User, Loader2, ScanFace, Eye, EyeOff, ArrowLeft, MailCheck, Check } from 'lucide-react';

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--gold) / 0.18)',
backdropFilter: 'blur(14px)',
boxShadow: '0 0 40px rgb(var(--gold) / 0.06)',
};

const inputWrap: React.CSSProperties = {
background: 'rgb(var(--bg) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.22)',
};

const inputClass =
'flex-1 min-w-0 bg-transparent py-3.5 text-[rgb(var(--gold))] placeholder:text-[rgb(var(--muted)/0.6)] focus:outline-none font-body';

type Mode = 'login' | 'signup' | 'forgot';
type Notice = { kind: 'error' | 'ok'; text: string } | null;

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
return (
<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{label}</label>
<div className="flex items-center gap-3 rounded-xl px-4" style={inputWrap}>
<span className="text-[rgb(var(--muted))]">{icon}</span>
{children}
</div>
</div>
);
}

export default function AuthPage() {
const router = useRouter();
const { t, lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);

const [mode, setMode] = useState<Mode>('login');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPw, setShowPw] = useState(false);
const [username, setUsername] = useState('');
const [gender, setGender] = useState<'male' | 'female' | ''>('');
const [adult, setAdult] = useState(false);
const [loading, setLoading] = useState(false);
const [notice, setNotice] = useState<Notice>(null);
const [checkEmail, setCheckEmail] = useState(false); // shown after sign-up when email confirmation is on

const origin = typeof window !== 'undefined' ? window.location.origin : '';

/** Turn Supabase's English errors into clear messages people understand. */
const friendly = (raw: string) => {
const m = raw.toLowerCase();
if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
return L('This email already has an account. Log in instead.', 'ဒီအီးမေးလ်နဲ့ အကောင့်ရှိပြီးသားပါ။ Log In ဝင်ပါ။');
if (m.includes('invalid login') || m.includes('invalid credentials'))
return L('Wrong email or password.', 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါတယ်။');
if (m.includes('email not confirmed'))
return L('Please confirm your email first. Check your inbox (and Spam).', 'အီးမေးလ်ကို အရင်အတည်ပြုပါ။ Inbox (နဲ့ Spam) ကို စစ်ကြည့်ပါ။');
if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
return L('Too many tries right now. Please wait a few minutes and try again.', 'ခဏအတွင်း အကြိမ်များလွန်းနေပါတယ်။ မိနစ်အနည်းငယ်စောင့်ပြီး ပြန်ကြိုးစားပါ။');
if (m.includes('password') && (m.includes('at least') || m.includes('short') || m.includes('weak')))
return L('Password must be at least 6 characters.', 'စကားဝှက် အနည်းဆုံး စာလုံး ၆ လုံး ရှိရပါမယ်။');
if (m.includes('invalid') && m.includes('email'))
return L('That email address doesn’t look right.', 'အီးမေးလ်လိပ်စာ မှန်မမှန် ပြန်စစ်ပါ။');
if (m.includes('fetch') || m.includes('network') || m.includes('failed to'))
return L('No connection. Check your internet (try Wi-Fi or turn VPN on/off) and try again.', 'အင်တာနက် မချိတ်မိပါ။ Wi-Fi ပြောင်းကြည့်ပါ (သို့) VPN ဖွင့်/ပိတ် လုပ်ပြီး ပြန်ကြိုးစားပါ။');
if (m.includes('database error'))
return L('Something went wrong on our side. Please try again in a minute.', 'ကျွန်ုပ်တို့ဘက်မှာ အမှားဖြစ်နေပါတယ်။ ခဏနေ ပြန်ကြိုးစားပါ။');
return raw;
};

const switchMode = (m: Mode) => {
setMode(m);
setNotice(null);
setCheckEmail(false);
};

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setNotice(null);
const cleanEmail = email.trim().toLowerCase();

if (mode === 'forgot') {
setLoading(true);
const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${origin}/reset-password` });
setLoading(false);
if (error) return setNotice({ kind: 'error', text: friendly(error.message) });
setNotice({
kind: 'ok',
text: L(
'If this email has an account, a reset link is on its way. Check your inbox and Spam.',
'ဒီအီးမေးလ်နဲ့ အကောင့်ရှိရင် စကားဝှက်ပြောင်းရန် လင့်ခ် ပို့ပေးလိုက်ပါပြီ။ Inbox နဲ့ Spam ကို စစ်ပါ။'
),
});
return;
}

if (mode === 'signup') {
const name = username.trim().replace(/\s+/g, ' ');
if (name.length < 2) return setNotice({ kind: 'error', text: L('Username must be at least 2 characters.', 'အသုံးပြုသူအမည် အနည်းဆုံး စာလုံး ၂ လုံး ရှိရပါမယ်။') });
if (!gender) return setNotice({ kind: 'error', text: t('Please select your gender to continue.') });
if (password.length < 6) return setNotice({ kind: 'error', text: friendly('password at least') });
if (!adult) return setNotice({ kind: 'error', text: L('Potentia is for people 18 and over.', 'Potentia ကို အသက် ၁၈ နှစ်နှင့်အထက်သာ သုံးနိုင်ပါတယ်။') });

setLoading(true);
const { data, error } = await supabase.auth.signUp({
email: cleanEmail,
password,
options: {
data: { username: name.slice(0, 30), gender, adult: true },
emailRedirectTo: `${origin}/`,
},
});
if (error) {
setLoading(false);
return setNotice({ kind: 'error', text: friendly(error.message) });
}
// Supabase hides "already registered" when email confirmation is on: the user comes back with no identities.
if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
setLoading(false);
setMode('login');
return setNotice({ kind: 'error', text: friendly('already registered') });
}
if (!data.session) {
// Email confirmation is on: the account + profile exist, they just need to tap the link.
setLoading(false);
setCheckEmail(true);
return;
}
// Backup in case the database trigger isn't installed yet (does nothing if the profile exists).
if (data.user) {
await supabase
.from('profiles')
.upsert({ id: data.user.id, email: data.user.email, username: name.slice(0, 30), gender }, { onConflict: 'id', ignoreDuplicates: true });
}
router.push('/');
router.refresh();
return;
}

// login
setLoading(true);
const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
if (error) {
setLoading(false);
return setNotice({ kind: 'error', text: friendly(error.message) });
}
router.push('/');
router.refresh();
};

const resendConfirm = async () => {
setLoading(true);
const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${origin}/` } });
setLoading(false);
setNotice(
error
? { kind: 'error', text: friendly(error.message) }
: { kind: 'ok', text: L('Sent again. Check your inbox and Spam.', 'ထပ်ပို့ပေးလိုက်ပါပြီ။ Inbox နဲ့ Spam ကို စစ်ပါ။') }
);
};

const title =
mode === 'login' ? t('Welcome back') : mode === 'signup' ? t('Start your ascent') : L('Reset your password', 'စကားဝှက် ပြန်သတ်မှတ်ရန်');

return (
<div
className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4 pb-4 relative overflow-hidden transition-colors"
style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 16px), 56px)' }}
>
<ThemeStyles />
<LanguageStyles />
<MarbleBackground />
<MarbleImage />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
.float-seal { animation: float 3s ease-in-out infinite; }
`}</style>

<div className="w-full max-w-sm relative z-10">
<div className="flex items-center justify-end gap-2 mb-6">
<LanguageToggle />
<ThemeToggle />
</div>

{/* Logo */}
<div className="flex flex-col items-center mb-8">
<div className="relative flex items-center justify-center mb-5" style={{ width: 120, height: 120 }}>
<span
className="absolute inset-0 rounded-full"
style={{ background: 'radial-gradient(circle, rgb(var(--gold) / 0.35) 0%, transparent 65%)', filter: 'blur(6px)' }}
/>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={LOGO_SRC}
alt="Potentia"
className="relative float-seal"
style={{ height: 96, width: 'auto', filter: 'drop-shadow(0 0 12px rgb(var(--gold) / 0.5))' }}
/>
</div>
<span className="font-display text-sm tracking-[0.45em] text-[rgb(var(--gold))] uppercase mb-2">Potentia</span>
<h1 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] text-center">{checkEmail ? L('Check your email', 'အီးမေးလ် စစ်ပါ') : title}</h1>
<p className="font-body text-sm text-[rgb(var(--muted))] mt-2 text-center">{t('Your transformation, guided by AI')}</p>
</div>

<div className="rounded-3xl p-6" style={cardStyle}>
{checkEmail ? (
/* ---------- after sign-up, when email confirmation is on ---------- */
<div className="text-center">
<span className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
<MailCheck className="w-7 h-7 text-[rgb(var(--gold))]" />
</span>
<p className="font-body text-sm text-[rgb(var(--gold))] mb-1">{L('We sent a link to', 'အတည်ပြုလင့်ခ် ပို့ထားပါတယ်')}</p>
<p className="font-body text-sm font-semibold text-[rgb(var(--gold))] break-all mb-3">{email.trim().toLowerCase()}</p>
<p className="font-body text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-5">
{L(
'Tap the link in the email to activate your account, then come back and log in. Can’t find it? Check Spam / Promotions.',
'အီးမေးလ်ထဲက လင့်ခ်ကို နှိပ်ပြီး အကောင့်ဖွင့်ပါ၊ ပြီးရင် ဒီမှာ Log In ဝင်ပါ။ မတွေ့ရင် Spam / Promotions ထဲ ကြည့်ပါ။'
)}
</p>
{notice && (
<p
className="font-body text-xs rounded-lg px-3 py-2 mb-3"
style={notice.kind === 'error' ? { color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' } : { color: 'rgb(var(--gold))', background: 'rgb(var(--gold) / 0.1)' }}
>
{notice.text}
</p>
)}
<button
type="button"
onClick={() => switchMode('login')}
className="w-full font-body font-semibold py-3.5 rounded-xl text-[13px] tracking-[0.08em] uppercase mb-2"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t('Log In')}
</button>
<button type="button" onClick={resendConfirm} disabled={loading} className="font-body text-xs text-[rgb(var(--muted-hover))] underline underline-offset-2 disabled:opacity-60">
{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : L('Send the email again', 'အီးမေးလ် ထပ်ပို့ရန်')}
</button>
</div>
) : (
<>
{mode !== 'forgot' ? (
<div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgb(var(--bg) / 0.5)' }}>
{(['login', 'signup'] as const).map(m => {
const active = mode === m;
return (
<button
key={m}
type="button"
onClick={() => switchMode(m)}
className="font-body text-[13px] py-2.5 rounded-lg transition-all"
style={{
background: active ? 'rgb(var(--gold))' : 'transparent',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{m === 'login' ? t('Log In') : t('Sign Up')}
</button>
);
})}
</div>
) : (
<button type="button" onClick={() => switchMode('login')} className="flex items-center gap-1.5 font-body text-xs text-[rgb(var(--muted-hover))] mb-5">
<ArrowLeft className="w-3.5 h-3.5" /> {L('Back to log in', 'Log In သို့ ပြန်သွားရန်')}
</button>
)}

<form onSubmit={handleSubmit} className="space-y-4" noValidate>
{mode === 'forgot' && (
<p className="font-body text-xs text-[rgb(var(--muted-hover))] leading-relaxed">
{L('Enter your email and we’ll send you a link to set a new password.', 'သင့်အီးမေးလ် ထည့်ပါ။ စကားဝှက်အသစ် သတ်မှတ်ရန် လင့်ခ် ပို့ပေးပါမယ်။')}
</p>
)}

{mode === 'signup' && (
<Field icon={<User className="w-4 h-4" />} label={t('Username')}>
<input
type="text"
value={username}
onChange={e => setUsername(e.target.value)}
maxLength={30}
autoComplete="nickname"
placeholder="Marcus"
className={inputClass}
style={{ fontSize: 16 }}
/>
</Field>
)}

<Field icon={<Mail className="w-4 h-4" />} label={t('Email')}>
<input
type="email"
inputMode="email"
value={email}
onChange={e => setEmail(e.target.value)}
required
autoComplete="email"
autoCapitalize="none"
autoCorrect="off"
spellCheck={false}
placeholder="you@email.com"
className={inputClass}
style={{ fontSize: 16 }}
/>
</Field>

{mode !== 'forgot' && (
<div>
<Field icon={<Lock className="w-4 h-4" />} label={t('Password')}>
<input
type={showPw ? 'text' : 'password'}
value={password}
onChange={e => setPassword(e.target.value)}
required
minLength={6}
autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
placeholder="••••••••"
className={inputClass}
style={{ fontSize: 16 }}
/>
<button
type="button"
onClick={() => setShowPw(v => !v)}
className="text-[rgb(var(--muted))] p-1 -mr-1"
aria-label={showPw ? 'Hide password' : 'Show password'}
>
{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
</button>
</Field>
{mode === 'login' ? (
<div className="flex justify-end mt-2">
<button type="button" onClick={() => switchMode('forgot')} className="font-body text-[11px] text-[rgb(var(--muted-hover))] underline underline-offset-2">
{L('Forgot password?', 'စကားဝှက် မေ့နေလား?')}
</button>
</div>
) : (
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-2">{L('At least 6 characters.', 'အနည်းဆုံး စာလုံး ၆ လုံး။')}</p>
)}
</div>
)}

{mode === 'signup' && (
<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{t('Gender')}</label>
<div className="grid grid-cols-2 gap-2">
{(['male', 'female'] as const).map(g => {
const active = gender === g;
return (
<button
key={g}
type="button"
onClick={() => setGender(g)}
className="font-body text-[13px] py-3 rounded-xl transition-all"
style={{
background: active ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--bg) / 0.6)',
border: `1px solid ${active ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.22)'}`,
color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{g === 'male' ? t('Male') : t('Female')}
</button>
);
})}
</div>
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-2">{t('Used only to pick the right face measurements.')}</p>
</div>
)}

{mode === 'signup' && (
<button
type="button"
onClick={() => setAdult(a => !a)}
className="w-full flex items-start gap-3 text-left rounded-xl px-3 py-3"
style={{ background: 'rgb(var(--bg) / 0.6)', border: `1px solid ${adult ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.22)'}` }}
>
<span
className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5"
style={{ background: adult ? 'rgb(var(--gold))' : 'transparent', border: '1px solid rgb(var(--gold) / 0.6)' }}
>
{adult && <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--bg))' }} />}
</span>
<span className="font-body text-xs text-[rgb(var(--muted-hover))] leading-relaxed">
{L('I am 18 years old or older.', 'ကျွန်ုပ် အသက် ၁၈ နှစ် (သို့) အထက် ဖြစ်ပါတယ်။')}
</span>
</button>
)}

{notice && (
<div
className="font-body text-xs rounded-lg px-3 py-2"
style={notice.kind === 'error' ? { color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' } : { color: 'rgb(var(--gold))', background: 'rgb(var(--gold) / 0.1)' }}
>
{notice.text}
{notice.kind === 'error' && mode === 'signup' && notice.text === friendly('already registered') && (
<button type="button" onClick={() => switchMode('login')} className="block mt-1 underline underline-offset-2 font-semibold">
{t('Log In')}
</button>
)}
</div>
)}

<button
type="submit"
disabled={loading}
className="w-full flex items-center justify-center gap-2 font-body font-semibold py-3.5 rounded-xl text-[13px] tracking-[0.08em] uppercase disabled:opacity-60 transition-all"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', boxShadow: '0 0 20px rgb(var(--gold) / 0.3)' }}
>
{loading ? (
<Loader2 className="w-4 h-4 animate-spin" />
) : mode === 'login' ? (
t('Enter')
) : mode === 'signup' ? (
t('Create Account')
) : (
L('Send reset link', 'လင့်ခ် ပို့ရန်')
)}
</button>
</form>
</>
)}
</div>

<div className="flex items-center justify-center gap-2 mt-6 font-body text-[11px] text-[rgb(var(--muted))] text-center">
<ScanFace className="w-3.5 h-3.5 flex-shrink-0" />
<span>{L('Face scans run on your device. Scan photos are never uploaded.', 'မျက်နှာစကင်န်ကို သင့်ဖုန်းပေါ်မှာပဲ လုပ်ပါတယ်။ စကင်န်ဓာတ်ပုံတွေကို ဘယ်တော့မှ upload မလုပ်ပါ။')}</span>
</div>
<p className="mt-3 font-body text-[11px] text-[rgb(var(--muted))] text-center">
{t('By continuing you agree to our')}{' '}
<a href="/terms" className="underline underline-offset-2">{t('Terms of Use')}</a> ·{' '}
<a href="/privacy" className="underline underline-offset-2">{t('Privacy Policy')}</a>
</p>
</div>
</div>
);
}

