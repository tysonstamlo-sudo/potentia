'use client';

// app/components/NotificationToggle.tsx — dashboard card to turn reminders on/off.

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { getPushState, enablePush, disablePush, type PushState } from '../../lib/push';

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--gold) / 0.2)',
backdropFilter: 'blur(10px)',
};

export default function NotificationToggle({ userId }: { userId: string }) {
const { t } = useLang();
const [state, setState] = useState<PushState | null>(null);
const [busy, setBusy] = useState(false);

useEffect(() => {
getPushState().then(setState).catch(() => setState('unsupported'));
}, []);

if (state === null || state === 'unsupported') return null;

const turnOn = async () => {
setBusy(true);
try {
setState(await enablePush(userId));
} finally {
setBusy(false);
}
};
const turnOff = async () => {
setBusy(true);
try {
setState(await disablePush());
} finally {
setBusy(false);
}
};

return (
<div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={cardStyle}>
<div className="flex items-start gap-3 min-w-0">
<span
className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
style={{ background: 'rgb(var(--gold) / 0.12)' }}
>
{state === 'on' ? (
<Bell className="w-4 h-4 text-[rgb(var(--gold))]" />
) : (
<BellOff className="w-4 h-4 text-[rgb(var(--muted))]" />
)}
</span>
<div className="min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium">{t('Reminders')}</p>
<p className="text-[11px] text-[rgb(var(--muted-hover))] leading-relaxed">
{state === 'on'
? t("On. We'll remind you about your streak and weekly scan.")
: state === 'denied'
? t('Blocked. Allow notifications for this app in your phone settings.')
: state === 'needs-install'
? t('On iPhone, add Potentia to your Home Screen first (Share → Add to Home Screen), then open it from there.')
: t('Get a reminder so you never lose your streak.')}
</p>
</div>
</div>
{(state === 'off' || state === 'on') && (
<button
onClick={state === 'on' ? turnOff : turnOn}
disabled={busy}
className="flex-shrink-0 text-xs font-semibold rounded-xl px-4 py-2.5 disabled:opacity-50"
style={
state === 'on'
? { background: 'rgb(var(--muted) / 0.12)', color: 'rgb(var(--muted-hover))' }
: { background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }
}
>
{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'on' ? t('Turn off') : t('Turn on')}
</button>
)}
</div>
);
}

