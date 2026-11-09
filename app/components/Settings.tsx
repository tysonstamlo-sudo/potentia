'use client';

// app/components/Settings.tsx — profile picture, username, language, theme, notifications,
// password, log out, legal pages and "Delete my account" (Google Play requires that one).

import React, { useEffect, useRef, useState } from 'react';
import { affiliateLink, type AffiliateNumbers } from '../../lib/affiliate';
import { fmtMMK } from '../../lib/payments';
import { supabase } from '../../lib/supabase';
import { useLang, LanguageToggle } from '../../lib/i18n';
import { ThemeToggle } from '../../lib/theme';
import NotificationToggle from './NotificationToggle';
import { Sheet } from './shopShared';
import { Camera, Loader2, Check, LogOut, KeyRound, Trash2, FileText, Shield, ChevronRight, Share2, Percent } from 'lucide-react';

const card: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
};
const input: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.6)',
border: '1px solid rgb(var(--muted) / 0.2)',
fontSize: 16,
};

/** Round picture with your photo, or your first letter. */
export function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
const [broken, setBroken] = useState(false);
const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
return (
<span
className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 font-display font-bold"
style={{
width: size,
height: size,
fontSize: size * 0.42,
background: 'linear-gradient(145deg, rgb(var(--gold) / 0.35), rgb(var(--surface)))',
color: 'rgb(var(--gold))',
boxShadow: '0 0 0 1.5px rgb(var(--gold) / 0.55), 0 0 14px rgb(var(--gold) / 0.25)',
}}
>
{url && !broken ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={url} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
) : (
letter
)}
</span>
);
}

/** Square-crop the middle of a photo and shrink it to 400x400 JPEG. */
async function squareJpeg(file: File): Promise<Blob> {
const url = URL.createObjectURL(file);
try {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = url;
});
const side = Math.min(img.width, img.height);
const c = document.createElement('canvas');
c.width = 400;
c.height = 400;
const ctx = c.getContext('2d')!;
ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 400, 400);
return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not read photo'))), 'image/jpeg', 0.86));
} finally {
URL.revokeObjectURL(url);
}
}

export default function Settings({
userId,
email,
username,
avatarUrl,
onClose,
onChanged,
onLogout,
}: {
userId: string;
email: string;
username: string;
avatarUrl: string | null;
onClose: () => void;
onChanged: (v: { username?: string; avatarUrl?: string | null }) => void;
onLogout: () => void;
}) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const fileRef = useRef<HTMLInputElement | null>(null);
const [name, setName] = useState(username);
const [pic, setPic] = useState<string | null>(avatarUrl);
const [busy, setBusy] = useState<'pic' | 'name' | 'pw' | 'delete' | null>(null);
const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

const say = (ok: boolean, text: string) => setMsg({ ok, text });

// affiliates see their own numbers here
const [aff, setAff] = useState<AffiliateNumbers | null>(null);
type AffPay = { created_at: string; buyer: string; plan: string; amount_mmk: number | null; status: string; reason: string | null; commission_mmk: number };
const [affPays, setAffPays] = useState<AffPay[]>([]);
const [copied, setCopied] = useState(false);
useEffect(() => {
supabase.rpc('my_affiliate_stats').then(({ data }) => {
const row = (data as AffiliateNumbers[] | null)?.[0];
if (row) {
setAff(row);
supabase.rpc('my_affiliate_payments').then(({ data: pays }) => setAffPays((pays as AffPay[] | null) ?? []));
}
});
}, []);
const shareAff = async () => {
if (!aff) return;
const link = affiliateLink(aff.code);
const text = L(
`Scan your face and find your tier on Potentia. Use my code ${aff.code}:`,
`Potentia မှာ မျက်နှာ scan လုပ်ပြီး သင့်အဆင့်ကို သိလိုက်ပါ။ ကျွန်တော့်ကုဒ် ${aff.code} ကို သုံးပါ:`
);
try {
if (navigator.share) return await navigator.share({ title: 'Potentia', text, url: link });
} catch {
return;
}
try {
await navigator.clipboard.writeText(`${text} ${link}`);
setCopied(true);
setTimeout(() => setCopied(false), 1600);
} catch {
/* ignore */
}
};

const pickPhoto = async (file: File | undefined) => {
if (!file) return;
setBusy('pic');
setMsg(null);
try {
const blob = await squareJpeg(file);
const path = `${userId}/${Date.now()}.jpg`;
const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
if (upErr) throw upErr;
const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl as string;
const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
if (error) throw error;
// remove the old picture so storage stays clean
if (pic) {
const old = pic.split('/avatars/')[1];
if (old) await supabase.storage.from('avatars').remove([old]);
}
setPic(url);
onChanged({ avatarUrl: url });
say(true, L('Profile picture updated.', 'ပရိုဖိုင်ပုံ ပြောင်းပြီးပါပြီ။'));
} catch (e) {
console.error('avatar failed', e);
say(false, L('Could not upload the photo. Try another one.', 'ဓာတ်ပုံ တင်လို့ မရပါ။ အခြားပုံ စမ်းကြည့်ပါ။'));
} finally {
setBusy(null);
}
};

const removePhoto = async () => {
if (!pic) return;
setBusy('pic');
const old = pic.split('/avatars/')[1];
await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
if (old) await supabase.storage.from('avatars').remove([old]);
setPic(null);
onChanged({ avatarUrl: null });
setBusy(null);
};

const saveName = async () => {
const clean = name.trim().replace(/\s+/g, ' ');
if (clean.length < 2 || clean.length > 30) return say(false, L('Username must be 2 to 30 characters.', 'အသုံးပြုသူအမည် စာလုံး ၂ မှ ၃၀ အထိ ဖြစ်ရပါမယ်။'));
if (clean === username) return;
setBusy('name');
setMsg(null);
const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', userId);
setBusy(null);
if (error) {
const taken = error.code === '23505' || /duplicate|unique/i.test(error.message);
return say(false, taken ? L('That username is taken. Try another.', 'ဒီအမည်ကို တခြားသူ သုံးပြီးသားပါ။ အခြားအမည် စမ်းပါ။') : error.message);
}
setName(clean);
onChanged({ username: clean });
say(true, L('Username saved.', 'အသုံးပြုသူအမည် သိမ်းပြီးပါပြီ။'));
};

const resetPassword = async () => {
setBusy('pw');
const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
setBusy(null);
say(
!error,
error
? L('Could not send the email. Try again in a few minutes.', 'အီးမေးလ် ပို့လို့ မရပါ။ မိနစ်အနည်းငယ်နေ ပြန်ကြိုးစားပါ။')
: L(`We sent a link to ${email} to set a new password.`, `စကားဝှက်အသစ် သတ်မှတ်ရန် လင့်ခ်ကို ${email} သို့ ပို့ပြီးပါပြီ။`)
);
};

const deleteAccount = async () => {
const typed = prompt(
L(
'This deletes your account, scans, progress and photo forever. Premium time is not refunded.\n\nType DELETE to confirm.',
'သင့်အကောင့်၊ စကင်န်များ၊ တိုးတက်မှုနဲ့ ဓာတ်ပုံကို အပြီးတိုင် ဖျက်ပါမယ်။ Premium ငွေ ပြန်မအမ်းပါ။\n\nအတည်ပြုရန် DELETE လို့ ရိုက်ပါ။'
)
);
if (typed?.trim().toUpperCase() !== 'DELETE') return;
setBusy('delete');
try {
const {
data: { session },
} = await supabase.auth.getSession();
const res = await fetch('/api/account/delete', {
method: 'POST',
headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
});
const json = (await res.json().catch(() => ({}))) as { error?: string };
if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
await supabase.auth.signOut();
window.location.href = '/login';
} catch (e) {
setBusy(null);
say(false, (e as Error).message);
}
};

const Row = ({ icon, label, onClick, danger, right }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean; right?: React.ReactNode }) => (
<button
onClick={onClick}
className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
style={{ color: danger ? 'rgb(var(--err))' : 'rgb(var(--muted-hover))', borderTop: '1px solid rgb(var(--muted) / 0.1)' }}
>
<span className="w-5 flex justify-center">{icon}</span>
<span className="flex-1 text-sm">{label}</span>
{right ?? <ChevronRight className="w-4 h-4 opacity-50" />}
</button>
);

return (
<Sheet onClose={onClose} title={L('Settings', 'ဆက်တင်များ')}>
<div className="space-y-5 font-body">
{/* profile */}
<div className="flex flex-col items-center pt-2">
<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />
<button onClick={() => fileRef.current?.click()} className="relative" aria-label="Change profile picture">
<Avatar url={pic} name={name} size={104} />
<span
className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', boxShadow: '0 0 0 3px rgb(var(--bg))' }}
>
{busy === 'pic' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
</span>
</button>
{pic && (
<button onClick={removePhoto} disabled={busy === 'pic'} className="mt-3 text-[11px] text-[rgb(var(--muted))] underline underline-offset-2">
{L('Remove photo', 'ဓာတ်ပုံ ဖယ်ရန်')}
</button>
)}
<p className="mt-2 text-[11px] text-[rgb(var(--muted))]">{email}</p>
</div>

<div className="rounded-2xl p-4" style={card}>
<label className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{L('Username', 'အသုံးပြုသူအမည်')}</label>
<div className="flex gap-2">
<input
value={name}
onChange={e => setName(e.target.value)}
maxLength={30}
className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[rgb(var(--gold))] focus:outline-none"
style={input}
/>
<button
onClick={saveName}
disabled={busy === 'name' || name.trim() === username}
className="rounded-xl px-4 font-semibold text-sm disabled:opacity-40 flex items-center"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy === 'name' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
</button>
</div>
<p className="text-[11px] text-[rgb(var(--muted))] mt-2">{L('Shown on rankings and to friends.', 'Ranking နဲ့ သူငယ်ချင်းတွေ မြင်ရပါမယ်။')}</p>
</div>

{aff && (
<div
className="rounded-2xl p-5"
style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.12), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.3)' }}
>
<div className="flex items-center gap-2 mb-3">
<Percent className="w-4 h-4 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{L('Affiliate dashboard', 'Affiliate ဒက်ရှ်ဘုတ်')}</span>
{!aff.active && <span className="text-[10px] ml-auto" style={{ color: 'rgb(var(--err))' }}>{L('Paused', 'ရပ်ထား')}</span>}
</div>
<div className="flex items-center justify-between gap-3 mb-4">
<div>
<p className="text-[11px] text-[rgb(var(--muted))]">{L('Your code', 'သင့်ကုဒ်')}</p>
<p className="font-display text-2xl font-bold tracking-[0.15em] text-[rgb(var(--gold))]">{aff.code}</p>
</div>
<button
onClick={shareAff}
className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3.5 py-2.5"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
{copied ? L('Copied', 'ကူးပြီး') : L('Share link', 'လင့်ခ် မျှဝေ')}
</button>
</div>
<div className="grid grid-cols-3 gap-2 mb-3">
{[
[L('Buyers', 'ဝယ်သူ'), String(aff.buyers)],
[L('Payments', 'ငွေပေးမှု'), String(aff.sales)],
[L('This month', 'ဒီလ'), fmtMMK(Number(aff.month_sales_mmk) * Number(aff.rate))],
].map(([k, v]) => (
<div key={k} className="rounded-xl p-2.5 text-center" style={{ background: 'rgb(var(--bg) / 0.4)' }}>
<p className="font-display text-sm font-bold text-[rgb(var(--gold))] truncate">{v}</p>
<p className="text-[10px] text-[rgb(var(--muted))]">{k}</p>
</div>
))}
</div>
<div className="space-y-1.5 text-xs">
<div className="flex justify-between text-[rgb(var(--muted-hover))]">
<span>{L(`You earned (${Math.round(Number(aff.rate) * 100)}%)`, `ရရှိငွေ (${Math.round(Number(aff.rate) * 100)}%)`)}</span>
<span className="font-semibold">{fmtMMK(Number(aff.earned_mmk))}</span>
</div>
<div className="flex justify-between text-[rgb(var(--muted-hover))]">
<span>{L('Already paid to you', 'ပေးပြီး')}</span>
<span>{fmtMMK(Number(aff.paid_mmk))}</span>
</div>
<div className="flex justify-between text-[rgb(var(--gold))] font-semibold pt-1.5" style={{ borderTop: '1px solid rgb(var(--gold) / 0.2)' }}>
<span>{L('Potentia owes you', 'Potentia က ပေးရန်')}</span>
<span>{fmtMMK(Math.max(0, Number(aff.owed_mmk)))}</span>
</div>
</div>
{affPays.length > 0 && (
<div className="mt-4">
<p className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase mb-2">{L('Your buyers’ payments', 'သင့်ဝယ်သူများ၏ ငွေပေးမှု')}</p>
<div className="space-y-2">
{affPays.slice(0, 15).map((x, i) => {
const st =
x.status === 'approved'
? { t: L(`+${fmtMMK(x.commission_mmk)}`, `+${fmtMMK(x.commission_mmk)}`), c: 'rgb(var(--gold))' }
: x.status === 'rejected'
? { t: L('Rejected', 'ပယ်ချ'), c: 'rgb(var(--err))' }
: { t: L('Waiting', 'စစ်ဆေးဆဲ'), c: 'rgb(var(--muted-hover))' };
return (
<div key={i} className="rounded-xl px-3 py-2" style={{ background: 'rgb(var(--bg) / 0.4)' }}>
<div className="flex items-center justify-between gap-2">
<span className="text-xs text-[rgb(var(--muted-hover))] truncate">
{x.buyer} · {x.plan === '1month' ? '1M' : x.plan === '6months' ? '6M' : x.plan === '1year' ? '1Y' : x.plan}
{x.amount_mmk ? ` · ${fmtMMK(x.amount_mmk)}` : ''}
</span>
<span className="text-xs font-semibold flex-shrink-0" style={{ color: st.c }}>
{st.t}
</span>
</div>
<div className="flex justify-between gap-2 text-[10px] text-[rgb(var(--muted))]">
<span>{new Date(x.created_at).toLocaleDateString()}</span>
{x.status === 'rejected' && x.reason && <span className="truncate" style={{ color: 'rgb(var(--err))' }}>{x.reason}</span>}
</div>
</div>
);
})}
</div>
</div>
)}
<p className="text-[10px] text-[rgb(var(--muted))] mt-3 leading-relaxed">
{L(
'Anyone who uses your code or link is yours for good: you earn on every Premium payment they make.',
'သင့်ကုဒ် (သို့) လင့်ခ်ကို သုံးသူတိုင်း သင့်ဝယ်သူ ဖြစ်သွားပါတယ်။ သူတို့ Premium ပေးတိုင်း သင် ရပါတယ်။'
)}
</p>
</div>
)}

{msg && (
<p
className="text-xs rounded-lg px-3 py-2"
style={msg.ok ? { color: 'rgb(var(--gold))', background: 'rgb(var(--gold) / 0.1)' } : { color: 'rgb(var(--err))', background: 'rgb(var(--err) / 0.1)' }}
>
{msg.text}
</p>
)}

{/* app */}
<div className="rounded-2xl overflow-hidden" style={card}>
<div className="flex items-center justify-between px-4 py-3">
<span className="text-sm text-[rgb(var(--muted-hover))]">{L('Language', 'ဘာသာစကား')}</span>
<LanguageToggle />
</div>
<div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgb(var(--muted) / 0.1)' }}>
<span className="text-sm text-[rgb(var(--muted-hover))]">{L('Theme', 'အရောင်')}</span>
<ThemeToggle />
</div>
<div className="px-4 py-3" style={{ borderTop: '1px solid rgb(var(--muted) / 0.1)' }}>
<NotificationToggle userId={userId} />
</div>
</div>

{/* account */}
<div className="rounded-2xl overflow-hidden" style={card}>
<Row
icon={busy === 'pw' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
label={L('Change password', 'စကားဝှက် ပြောင်းရန်')}
onClick={resetPassword}
/>
<Row icon={<FileText className="w-4 h-4" />} label={L('Terms of Use', 'အသုံးပြုမှု စည်းမျဉ်း')} onClick={() => (window.location.href = '/terms')} />
<Row icon={<Shield className="w-4 h-4" />} label={L('Privacy Policy', 'ကိုယ်ရေးအချက်အလက် မူဝါဒ')} onClick={() => (window.location.href = '/privacy')} />
<Row icon={<LogOut className="w-4 h-4" />} label={L('Log out', 'ထွက်ရန်')} onClick={onLogout} right={<span />} />
</div>

<div className="rounded-2xl overflow-hidden" style={card}>
<Row
icon={busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
label={L('Delete my account', 'အကောင့် ဖျက်ရန်')}
onClick={deleteAccount}
danger
right={<span />}
/>
</div>
<p className="text-center text-[10px] text-[rgb(var(--muted))] tracking-[0.3em] uppercase pb-2">Potentia</p>
</div>
</Sheet>
);
}

