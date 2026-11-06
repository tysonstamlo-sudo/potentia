'use client';

// app/reset-password/page.tsx — where the "reset password" email link lands.
// Supabase signs the user in from the link, then they pick a new password here.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ThemeStyles, MarbleBackground } from '../../lib/theme';
import { useLang, LanguageToggle, LanguageStyles } from '../../lib/i18n';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--gold) / 0.18)',
backdropFilter: 'blur(14px)',
};

export default function ResetPasswordPage() {
const router = useRouter();
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);

const [ready, setReady] = useState<'wait' | 'ok' | 'bad'>('wait');
const [pw, setPw] = useState('');
const [pw2, setPw2] = useState('');
const [show, setShow] = useState(false);
const [busy, setBusy] = useState(false);
const [err, setErr] = useState('');
const [done, setDone] = useState(false);

useEffect(() => {
let alive = true;
const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
if (!alive) return;
if (event === 'PASSWORD_RECOVERY' || session) setReady('ok');
});
// The link signs them in; give it a moment, then check.
const timer = setTimeout(async () => {
const { data } = await supabase.auth.getSession();
if (!alive) return;
setReady(data.session ? 'ok' : 'bad');
}, 1500);
return () => {
alive = false;
clearTimeout(timer);
sub.subscription.unsubscribe();
};
}, []);

const save = async (e: React.FormEvent) => {
e.preventDefault();
setErr('');
if (pw.length < 6) return setErr(L('Password must be at least 6 characters.', 'စကားဝှက် အနည်းဆုံး စာလုံး ၆ လုံး ရှိရပါမယ်။'));
if (pw !== pw2) return setErr(L('The two passwords don’t match.', 'စကားဝှက် နှစ်ခု မတူပါ။'));
setBusy(true);
const { error } = await supabase.auth.updateUser({ password: pw });
setBusy(false);
if (error) {
const m = error.message.toLowerCase();
return setErr(
m.includes('different from the old')
? L('Pick a password different from your old one.', 'စကားဝှက်အဟောင်းနဲ့ မတူတာ ရွေးပါ။')
: m.includes('session') || m.includes('expired')
? L('This link has expired. Ask for a new one from the login screen.', 'လင့်ခ် သက်တမ်းကုန်သွားပါပြီ။ Login စာမျက်နှာကနေ အသစ်တောင်းပါ။')
: error.message
);
}
setDone(true);
setTimeout(() => router.replace('/'), 1500);
};

const input = 'flex-1 min-w-0 bg-transparent py-3.5 text-[rgb(var(--gold))] placeholder:text-[rgb(var(--muted)/0.6)] focus:outline-none font-body';
const wrap: React.CSSProperties = { background: 'rgb(var(--bg) / 0.6)', border: '1px solid rgb(var(--muted) / 0.22)' };

return (
<div
className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4 pb-4 relative overflow-hidden"
style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 16px), 56px)' }}
>
<ThemeStyles />
<LanguageStyles />
<MarbleBackground />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }
`}</style>

<div className="w-full max-w-sm relative z-10">
<div className="flex justify-end mb-6">
<LanguageToggle />
</div>
<h1 className="font-display text-3xl font-semibold text-[rgb(var(--gold))] text-center mb-8">
{L('New password', 'စကားဝှက်အသစ်')}
</h1>

<div className="rounded-3xl p-6" style={cardStyle}>
{ready === 'wait' && (
<div className="flex justify-center py-6">
<Loader2 className="w-6 h-6 animate-spin text-[rgb(var(--gold))]" />
</div>
)}

{ready === 'bad' && (
<div className="text-center">
<p className="font-body text-sm text-[rgb(var(--muted-hover))] mb-5">
{L(
'This link has expired or was already used. Ask for a new one.',
'ဒီလင့်ခ် သက်တမ်းကုန် (သို့) သုံးပြီးသားပါ။ အသစ် ပြန်တောင်းပါ။'
)}
</p>
<button
onClick={() => router.replace('/login')}
className="w-full font-body font-semibold py-3.5 rounded-xl text-[13px] uppercase tracking-[0.08em]"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{L('Back to log in', 'Log In သို့ ပြန်သွားရန်')}
</button>
</div>
)}

{ready === 'ok' && done && (
<div className="text-center py-4">
<CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[rgb(var(--gold))]" />
<p className="font-body text-sm text-[rgb(var(--gold))]">{L('Password changed. Taking you in…', 'စကားဝှက် ပြောင်းပြီးပါပြီ။ ဝင်နေပါတယ်…')}</p>
</div>
)}

{ready === 'ok' && !done && (
<form onSubmit={save} className="space-y-4" noValidate>
{[
{ v: pw, set: setPw, label: L('New password', 'စကားဝှက်အသစ်') },
{ v: pw2, set: setPw2, label: L('Type it again', 'ထပ်ရိုက်ပါ') },
].map((f, i) => (
<div key={i}>
<label className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{f.label}</label>
<div className="flex items-center gap-3 rounded-xl px-4" style={wrap}>
<Lock className="w-4 h-4 text-[rgb(var(--muted))]" />
<input
type={show ? 'text' : 'password'}
value={f.v}
onChange={e => f.set(e.target.value)}
autoComplete="new-password"
placeholder="••••••••"
className={input}
style={{ fontSize: 16 }}
/>
{i === 0 && (
<button type="button" onClick={() => setShow(s => !s)} className="text-[rgb(var(--muted))] p-1 -mr-1" aria-label="Show password">
{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
</button>
)}
</div>
</div>
))}

{err && (
<p className="font-body text-xs rounded-lg px-3 py-2" style={{ color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' }}>
{err}
</p>
)}

<button
type="submit"
disabled={busy}
className="w-full flex items-center justify-center gap-2 font-body font-semibold py-3.5 rounded-xl text-[13px] uppercase tracking-[0.08em] disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L('Save new password', 'စကားဝှက်အသစ် သိမ်းရန်')}
</button>
</form>
)}
</div>
</div>
</div>
);
}

