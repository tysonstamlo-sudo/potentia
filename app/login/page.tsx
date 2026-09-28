'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground, MarbleImage } from '../../lib/theme';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

const labelCls =
'font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase mb-2 block';
const inputCls =
'font-body w-full bg-transparent border-b border-[rgb(var(--muted)/0.3)] py-2.5 pl-6 pr-2 text-sm text-[rgb(var(--gold))] placeholder:text-[rgb(var(--muted)/0.6)] focus:outline-none focus:border-[rgb(var(--gold))] transition-all';
const iconCls = 'absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]';
const tabCls = (active: boolean) =>
`font-body pb-3 text-[13px] tracking-[0.05em] transition-all relative ${
active
? 'text-[rgb(var(--gold))]'
: 'text-[rgb(var(--muted))] hover:text-[rgb(var(--muted-hover))]'
}`;
const genderCls = (active: boolean) =>
`flex-1 py-2.5 rounded-sm border text-[13px] tracking-wide transition-all ${
active
? 'border-[rgb(var(--gold))] text-[rgb(var(--gold))] bg-[rgb(var(--gold)/0.08)]'
: 'border-[rgb(var(--muted)/0.3)] text-[rgb(var(--muted))] hover:border-[rgb(var(--muted)/0.6)]'
}`;

export default function AuthPage() {
const router = useRouter();
const [mode, setMode] = useState<'login' | 'signup'>('login');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [username, setUsername] = useState('');
const [gender, setGender] = useState<'male' | 'female' | ''>('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setError('');

if (mode === 'signup' && !gender) {
setError('Please select your gender to continue.');
return;
}

setLoading(true);

if (mode === 'signup') {
const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
if (signUpError) {
setError(signUpError.message);
setLoading(false);
return;
}
if (data.user) {
await supabase.from('profiles').insert({
id: data.user.id,
email: data.user.email,
username,
gender,
});
}
router.push('/');
router.refresh();
} else {
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
setError(signInError.message);
setLoading(false);
return;
}
router.push('/');
router.refresh();
}
setLoading(false);
};

return (
<div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--gold))] flex items-center justify-center p-4 transition-colors">
<ThemeStyles />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
.font-body { font-family: 'Inter', sans-serif; }
.relief {
background:
radial-gradient(circle at 30% 20%, rgb(var(--glow) / var(--glow-a)), transparent 45%),
radial-gradient(circle at 80% 80%, rgb(var(--glow) / calc(var(--glow-a) * 0.6)), transparent 50%);
}
.seal-ring { filter: drop-shadow(0 0 18px rgb(var(--glow) / 0.25)); }
`}</style>

<MarbleBackground />
<MarbleImage />
<div className="relief fixed inset-0 pointer-events-none" />

<ThemeToggle className="fixed top-4 right-4 z-10" />

<div className="w-full max-w-sm relative">
{/* Medallion */}
<div className="flex flex-col items-center mb-10">
<div className="relative w-24 h-24 mb-6 seal-ring">
<svg className="w-24 h-24 -rotate-90" viewBox="0 0 108 108">
<circle
cx="54" cy="54" r="52" fill="none" strokeWidth="1"
style={{ stroke: 'rgb(var(--muted) / 0.25)' }}
/>
<circle
cx="54" cy="54" r="44" strokeWidth="1"
style={{ fill: 'rgb(var(--surface))', stroke: 'rgb(var(--gold) / 0.5)' }}
/>
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="font-display text-2xl text-[rgb(var(--gold))]">P</span>
</div>
</div>
<span className="font-body text-[10px] tracking-[0.35em] text-[rgb(var(--gold))] uppercase mb-3">
Potentia
</span>
<h1 className="font-display text-3xl font-light tracking-tight text-[rgb(var(--gold))]">
{mode === 'login' ? 'Welcome back' : 'Begin your ascent'}
</h1>
<p className="font-body text-[rgb(var(--muted))] text-sm mt-2">
Your transformation, guided by AI
</p>
</div>

{/* Form */}
<div className="px-1">
<div className="flex gap-8 mb-8 border-b border-[rgb(var(--muted)/0.2)]">
<button type="button" onClick={() => setMode('login')} className={tabCls(mode === 'login')}>
Log In
{mode === 'login' && (
<div className="absolute -bottom-px left-0 right-0 h-px bg-[rgb(var(--gold))]" />
)}
</button>
<button type="button" onClick={() => setMode('signup')} className={tabCls(mode === 'signup')}>
Sign Up
{mode === 'signup' && (
<div className="absolute -bottom-px left-0 right-0 h-px bg-[rgb(var(--gold))]" />
)}
</button>
</div>

<form onSubmit={handleSubmit} className="space-y-5">
{mode === 'signup' && (
<div>
<label className={labelCls}>Username</label>
<div className="relative">
<User className={iconCls} />
<input
type="text"
required
value={username}
onChange={e => setUsername(e.target.value)}
placeholder="Marcus"
className={inputCls}
/>
</div>
</div>
)}

<div>
<label className={labelCls}>Email</label>
<div className="relative">
<Mail className={iconCls} />
<input
type="email"
required
value={email}
onChange={e => setEmail(e.target.value)}
placeholder="you@example.com"
className={inputCls}
/>
</div>
</div>

<div>
<label className={labelCls}>Password</label>
<div className="relative">
<Lock className={iconCls} />
<input
type="password"
required
minLength={6}
value={password}
onChange={e => setPassword(e.target.value)}
placeholder="••••••••"
className={inputCls}
/>
</div>
</div>

{mode === 'signup' && (
<div>
<label className={labelCls}>Gender</label>
<div className="flex gap-3">
<button type="button" onClick={() => setGender('male')} className={genderCls(gender === 'male')}>
Male
</button>
<button type="button" onClick={() => setGender('female')} className={genderCls(gender === 'female')}>
Female
</button>
</div>
</div>
)}

{error && (
<div className="font-body border border-[rgb(var(--err)/0.4)] rounded-sm px-4 py-3 text-xs text-[rgb(var(--err))]">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="font-body w-full border border-[rgb(var(--gold)/0.5)] hover:border-[rgb(var(--gold))] hover:bg-[rgb(var(--gold)/0.08)] disabled:opacity-40 text-[rgb(var(--gold))] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.1em] uppercase flex items-center justify-center gap-2 mt-2"
>
{loading ? (
<Loader2 className="w-4 h-4 animate-spin" />
) : mode === 'login' ? (
'Enter'
) : (
'Create Account'
)}
</button>
</form>
</div>

<p className="font-body text-center text-xs text-[rgb(var(--muted))] mt-8">
{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
<button
type="button"
onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
className="text-[rgb(var(--gold))] hover:text-[rgb(var(--gold-hover))] font-medium"
>
{mode === 'login' ? 'Sign up' : 'Log in'}
</button>
</p>
</div>
</div>
);
}

