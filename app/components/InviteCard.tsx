'use client';

// app/components/InviteCard.tsx — "Invite a friend, get 7 days Premium".
// The friend must start their free trial on their OWN phone (the trial anti-cheat checks it),
// so fake accounts on the same phone don't earn rewards.

import { useState, type CSSProperties } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { Gift, Copy, Share2, Loader2, Check } from 'lucide-react';

const cardStyle: CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--gold) / 0.2)',
backdropFilter: 'blur(10px)',
};

/** Save ?ref=CODE from the link so it survives the login / sign-up screens. */
export function rememberReferral() {
try {
const ref = new URLSearchParams(window.location.search).get('ref');
if (ref && /^[A-Z0-9]{4,10}$/i.test(ref)) localStorage.setItem('ptn_ref', ref.toUpperCase());
} catch {
/* ignore */
}
}

/** After sign-up: link this account to the friend who invited them (once). */
export async function applyReferral() {
try {
const code = localStorage.getItem('ptn_ref');
if (!code) return;
await supabase.rpc('set_referrer', { code });
localStorage.removeItem('ptn_ref');
} catch {
/* ignore */
}
}

export default function InviteCard({ rewards = 0 }: { rewards?: number }) {
const { t } = useLang();
const [link, setLink] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
const [copied, setCopied] = useState(false);

const getLink = async () => {
setBusy(true);
const { data, error } = await supabase.rpc('my_referral_code');
setBusy(false);
if (error || typeof data !== 'string') return;
const l = `${window.location.origin}/?ref=${data}`;
setLink(l);
return l;
};

const share = async () => {
const l = link ?? (await getLink());
if (!l) return;
const text = t('Scan your face and find your tier on Potentia. Free 7-day Premium trial:');
try {
if (navigator.share) {
await navigator.share({ title: 'Potentia', text, url: l });
return;
}
} catch {
return;
}
copy(l);
};

const copy = async (l?: string) => {
const v = l ?? link;
if (!v) return;
try {
await navigator.clipboard.writeText(v);
setCopied(true);
setTimeout(() => setCopied(false), 1800);
} catch {
/* ignore */
}
};

return (
<div className="p-5 rounded-2xl" style={cardStyle}>
<div className="flex items-start gap-3 mb-4">
<span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--gold) / 0.14)' }}>
<Gift className="w-5 h-5 text-[rgb(var(--gold))]" />
</span>
<div className="min-w-0">
<p className="font-body text-sm font-semibold text-[rgb(var(--gold))]">{t('Invite a friend, get 7 days Premium')}</p>
<p className="font-body text-[11px] text-[rgb(var(--muted-hover))] leading-relaxed">
{t('When your friend starts their free trial on their own phone, you get 7 days of Premium. Up to 8 times.')}
</p>
{rewards > 0 && (
<p className="font-body text-[11px] text-[rgb(var(--gold))] mt-1">{t('Friends joined: {n}', { n: rewards })}</p>
)}
</div>
</div>
{link && (
<button
onClick={() => copy()}
className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 mb-3 text-left"
style={{ background: 'rgb(var(--muted) / 0.1)' }}
>
<span className="font-body text-xs text-[rgb(var(--muted-hover))] truncate">{link}</span>
{copied ? <Check className="w-4 h-4 text-[rgb(var(--gold))] flex-shrink-0" /> : <Copy className="w-4 h-4 text-[rgb(var(--muted))] flex-shrink-0" />}
</button>
)}
<button
onClick={share}
disabled={busy}
className="font-body w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} {t('Share my invite link')}
</button>
</div>
);
}

