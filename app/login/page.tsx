'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground, MarbleImage } from '../../lib/theme';
import { useLang, LanguageToggle, LanguageStyles } from '../../lib/i18n';
import { Mail, Lock, User, Loader2, ScanFace } from 'lucide-react';

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
const { t } = useLang();
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
setError(t('Please select your gender to continue.'));
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
<div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center p-4 relative overflow-hidden transition-colors">
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

<ThemeToggle className="fixed top-4 right-4 z-40" />
<LanguageToggle className="fixed top-4 right-16 z-40" />

<div className="w-full max-w-sm relative z-10">
{/* Logo */}
<div className="flex flex-col items-center mb-8">
<div
className="w-16 h-16 rounded-2xl flex items-center justify-center float-seal mb-5"
style={{
background: 'linear-gradient(145deg, rgb(var(--gold)), rgb(var(--bg)))',
boxShadow: '0 0 30px rgb(var(--gold) / 0.35)',
}}
>
<span className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--bg))' }}>P</span>
</div>
<span className="font-display text-sm tracking-[0.35em] text-[rgb(var(--gold))] uppercase mb-2">Potentia</span>
<h1 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] text-center">
{mode === 'login' ? t('Welcome back') : t('Start your ascent')}
</h1>
<p className="font-body text-sm text-[rgb(var(--muted))] mt-2 text-center">{t('Your transformation, guided by AI')}</p>
</div>

{/* Card */}
<div className="rounded-3xl p-6" style={cardStyle}>
{/* Tabs */}
<div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgb(var(--bg) / 0.5)' }}>
{(['login', 'signup'] as const).map(m => {
const active = mode === m;
return (
<button
key={m}
type="button"
onClick={() => {
setMode(m);
setError('');
}}
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

<form onSubmit={handleSubmit} className="space-y-4">
{mode === 'signup' && (
<Field icon={<User className="w-4 h-4" />} label={t('Username')}>
<input
type="text"
value={username}
onChange={e => setUsername(e.target.value)}
required
placeholder="Marcus"
className={inputClass}
style={{ fontSize: 16 }}
/>
</Field>
)}

<Field icon={<Mail className="w-4 h-4" />} label={t('Email')}>
<input
type="email"
value={email}
onChange={e => setEmail(e.target.value)}
required
autoComplete="email"
placeholder="you@email.com"
className={inputClass}
style={{ fontSize: 16 }}
/>
</Field>

<Field icon={<Lock className="w-4 h-4" />} label={t('Password')}>
<input
type="password"
value={password}
onChange={e => setPassword(e.target.value)}
required
minLength={6}
autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
placeholder="••••••••"
className={inputClass}
style={{ fontSize: 16 }}
/>
</Field>

{mode === 'signup' && (
<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">
{t('Gender')}
</label>
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
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-2">
{t('Used only to pick the right face measurements.')}
</p>
</div>
)}

{error && (
<p
className="font-body text-xs rounded-lg px-3 py-2"
style={{ color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' }}
>
{error}
</p>
)}

<button
type="submit"
disabled={loading}
className="w-full flex items-center justify-center gap-2 font-body font-semibold py-3.5 rounded-xl text-[13px] tracking-[0.08em] uppercase disabled:opacity-60 transition-all"
style={{
background: 'rgb(var(--gold))',
color: 'rgb(var(--bg))',
boxShadow: '0 0 20px rgb(var(--gold) / 0.3)',
}}
>
{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? t('Enter') : t('Create Account')}
</button>
</form>
</div>

<div className="flex items-center justify-center gap-2 mt-6 font-body text-[11px] text-[rgb(var(--muted))] text-center">
<ScanFace className="w-3.5 h-3.5 flex-shrink-0" />
<span>{t('Face scans run on your device. Photos are never uploaded.')}</span>
</div>
</div>
</div>
);
}

