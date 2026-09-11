'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

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
<div className="min-h-screen bg-[#050505] text-[#C9A24B] flex items-center justify-center p-4">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
.font-body { font-family: 'Inter', sans-serif; }
.relief {
background:
radial-gradient(circle at 30% 20%, rgba(212,175,110,0.07), transparent 45%),
radial-gradient(circle at 80% 80%, rgba(74,93,83,0.05), transparent 50%);
}
.seal-ring { filter: drop-shadow(0 0 18px rgba(212,175,110,0.2)); }
`}</style>

<div className="relief fixed inset-0 pointer-events-none" />

<div className="w-full max-w-sm relative">
{/* Medallion */}
<div className="flex flex-col items-center mb-10">
<div className="relative w-24 h-24 mb-6 seal-ring">
<svg className="w-24 h-24 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" stroke="#7A6E5D" strokeOpacity="0.2" strokeWidth="1" />
<circle cx="54" cy="54" r="44" fill="#0D0D0D" stroke="#C9A24B" strokeOpacity="0.5" strokeWidth="1" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="font-display text-2xl text-[#C9A24B]">P</span>
</div>
</div>
<span className="font-body text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase mb-3">Potentia</span>
<h1 className="font-display text-3xl font-light tracking-tight text-[#C9A24B]">
{mode === 'login' ? 'Welcome back' : 'Begin your ascent'}
</h1>
<p className="font-body text-[#7A6E5D] text-sm mt-2">Your transformation, guided by AI</p>
</div>

{/* Form */}
<div className="border border-[#7A6E5D]/25 rounded-sm p-8 bg-[#0D0D0D]">
<div className="flex gap-8 mb-8 border-b border-[#7A6E5D]/20">
<button
onClick={() => setMode('login')}
className={`font-body pb-3 text-[13px] tracking-[0.05em] transition-all relative ${
mode === 'login' ? 'text-[#C9A24B]' : 'text-[#7A6E5D] hover:text-[#B0A48F]'
}`}
>
Log In
{mode === 'login' && <div className="absolute -bottom-px left-0 right-0 h-px bg-[#C9A24B]" />}
</button>
<button
onClick={() => setMode('signup')}
className={`font-body pb-3 text-[13px] tracking-[0.05em] transition-all relative ${
mode === 'signup' ? 'text-[#C9A24B]' : 'text-[#7A6E5D] hover:text-[#B0A48F]'
}`}
>
Sign Up
{mode === 'signup' && <div className="absolute -bottom-px left-0 right-0 h-px bg-[#C9A24B]" />}
</button>
</div>

<form onSubmit={handleSubmit} className="space-y-5">
{mode === 'signup' && (
<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase mb-2 block">Username</label>
<div className="relative">
<User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E5D]" />
<input
type="text"
required
value={username}
onChange={e => setUsername(e.target.value)}
placeholder="Marcus"
className="font-body w-full bg-transparent border-b border-[#7A6E5D]/30 py-2.5 pl-6 pr-2 text-sm text-[#C9A24B] placeholder:text-[#7A6E5D]/60 focus:outline-none focus:border-[#C9A24B] transition-all"
/>
</div>
</div>
)}

<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase mb-2 block">Email</label>
<div className="relative">
<Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E5D]" />
<input
type="email"
required
value={email}
onChange={e => setEmail(e.target.value)}
placeholder="you@example.com"
className="font-body w-full bg-transparent border-b border-[#7A6E5D]/30 py-2.5 pl-6 pr-2 text-sm text-[#C9A24B] placeholder:text-[#7A6E5D]/60 focus:outline-none focus:border-[#C9A24B] transition-all"
/>
</div>
</div>

<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase mb-2 block">Password</label>
<div className="relative">
<Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E5D]" />
<input
type="password"
required
minLength={6}
value={password}
onChange={e => setPassword(e.target.value)}
placeholder="••••••••"
className="font-body w-full bg-transparent border-b border-[#7A6E5D]/30 py-2.5 pl-6 pr-2 text-sm text-[#C9A24B] placeholder:text-[#7A6E5D]/60 focus:outline-none focus:border-[#C9A24B] transition-all"
/>
</div>
</div>

{mode === 'signup' && (
<div>
<label className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase mb-2 block">Gender</label>
<div className="flex gap-3">
<button
type="button"
onClick={() => setGender('male')}
className={`flex-1 py-2.5 rounded-sm border text-[13px] tracking-wide transition-all ${
gender === 'male'
? 'border-[#C9A24B] text-[#C9A24B] bg-[#C9A24B]/[0.06]'
: 'border-[#7A6E5D]/30 text-[#7A6E5D] hover:border-[#7A6E5D]/60'
}`}
>
Male
</button>
<button
type="button"
onClick={() => setGender('female')}
className={`flex-1 py-2.5 rounded-sm border text-[13px] tracking-wide transition-all ${
gender === 'female'
? 'border-[#C9A24B] text-[#C9A24B] bg-[#C9A24B]/[0.06]'
: 'border-[#7A6E5D]/30 text-[#7A6E5D] hover:border-[#7A6E5D]/60'
}`}
>
Female
</button>
</div>
</div>
)}

{error && (
<div className="font-body border border-[#8B4A3D]/40 rounded-sm px-4 py-3 text-xs text-[#D08A78]">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="font-body w-full border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] disabled:opacity-40 text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.1em] uppercase flex items-center justify-center gap-2 mt-2"
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

<p className="font-body text-center text-xs text-[#7A6E5D] mt-8">
{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
<button
onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
className="text-[#C9A24B] hover:text-[#F0C94A] font-medium"
>
{mode === 'login' ? 'Sign up' : 'Log in'}
</button>
</p>
</div>
</div>
);
}

