'use client';

// app/components/TrialSurvey.tsx — shown once when a free trial ends without paying: "What stopped you?"
// Answers show up in Admin → Revenue so you know the real reason.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { Check, Loader2 } from 'lucide-react';

export const SURVEY_REASONS: { id: string; emoji: string; label: string }[] = [
{ id: 'price', emoji: '💸', label: 'It’s too expensive for me' },
{ id: 'not_useful', emoji: '🤔', label: 'It wasn’t useful enough' },
{ id: 'payment_hard', emoji: '🏦', label: 'Paying was hard or confusing' },
{ id: 'later', emoji: '⏳', label: 'I’ll buy it later' },
{ id: 'other', emoji: '💬', label: 'Something else' },
];

export default function TrialSurvey({
userId,
offerOpen,
onClose,
onSeeOffer,
}: {
userId: string;
offerOpen: boolean;
onClose: () => void;
onSeeOffer: () => void;
}) {
const { t } = useLang();
const [reason, setReason] = useState<string | null>(null);
const [note, setNote] = useState('');
const [busy, setBusy] = useState(false);
const [done, setDone] = useState(false);
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;

const send = async () => {
if (!reason) return;
setBusy(true);
await supabase.from('trial_feedback').insert({ user_id: userId, reason, note: note.trim() || null });
setBusy(false);
setDone(true);
};

return createPortal(
<div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm font-body" style={{ background: 'rgb(0 0 0 / 0.7)' }}>
<div
className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-[92dvh] overflow-y-auto"
style={{
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface)) 45%)',
border: '1px solid rgb(var(--gold) / 0.25)',
paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
}}
>
{done ? (
<div className="text-center py-4">
<p className="font-display text-xl font-semibold text-[rgb(var(--gold))] mb-2">{t('Thank you 🙏')}</p>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-6">{t('This helps us make Potentia better for you.')}</p>
{offerOpen && (
<button
onClick={onSeeOffer}
className="w-full font-semibold py-4 rounded-2xl text-[15px] mb-3"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t('See my 39,000 MMK offer')}
</button>
)}
<button onClick={onClose} className="w-full text-sm text-[rgb(var(--muted))] py-2">
{t('Close')}
</button>
</div>
) : (
<>
<h2 className="font-display text-xl font-semibold text-[rgb(var(--gold))] mb-1">{t('Your free trial ended')}</h2>
<p className="text-sm text-[rgb(var(--muted-hover))] mb-5">{t('Quick question: what stopped you from going Premium?')}</p>
<div className="space-y-2.5 mb-4">
{SURVEY_REASONS.map(o => {
const active = reason === o.id;
return (
<button
key={o.id}
onClick={() => setReason(o.id)}
className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left"
style={
active
? { background: 'rgb(var(--gold) / 0.12)', border: '1px solid rgb(var(--gold) / 0.65)' }
: { background: 'rgb(var(--surface) / 0.55)', border: '1px solid rgb(var(--muted) / 0.18)' }
}
>
<span
className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
style={{ background: active ? 'rgb(var(--gold))' : 'transparent', border: active ? 'none' : '1.5px solid rgb(var(--muted) / 0.5)' }}
>
{active && <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--bg))' }} />}
</span>
<span className="text-lg">{o.emoji}</span>
<span className="text-sm" style={{ color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted-hover))' }}>
{t(o.label)}
</span>
</button>
);
})}
</div>
<textarea
value={note}
onChange={e => setNote(e.target.value.slice(0, 500))}
rows={2}
placeholder={t('Anything else you want to tell us? (optional)')}
className="w-full rounded-xl px-4 py-3 mb-4 text-[rgb(var(--gold))] focus:outline-none resize-none bg-transparent"
style={{ border: '1px solid rgb(var(--muted) / 0.25)', fontSize: 16 }}
/>
<button
onClick={send}
disabled={!reason || busy}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-40"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Send')}
</button>
<button onClick={onClose} className="w-full text-xs text-[rgb(var(--muted))] py-3">
{t('Skip')}
</button>
</>
)}
</div>
</div>,
document.body,
);
}

