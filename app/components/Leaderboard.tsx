'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Flame } from 'lucide-react';
import { useLang } from '../../lib/i18n';

type LeaderboardRow = {
username: string;
total_xp: number;
level: number;
current_streak: number;
};

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

export default function Leaderboard() {
const { t } = useLang();
const [rows, setRows] = useState<LeaderboardRow[]>([]);
const [currentUsername, setCurrentUsername] = useState('');
const [loading, setLoading] = useState(true);

useEffect(() => {
const load = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (session) {
const { data: profile } = await supabase
.from('profiles')
.select('username')
.eq('id', session.user.id)
.single();
if (profile?.username) setCurrentUsername(profile.username);
}

const { data, error } = await supabase
.from('leaderboard')
.select('username, total_xp, level, current_streak')
.order('total_xp', { ascending: false })
.limit(50);

if (error) console.error('Leaderboard fetch error:', error);
if (data) setRows(data);
setLoading(false);
};
load();
}, []);

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{t("Standing")}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{t("Rankings")}</h2>
<p className="text-xs text-[rgb(var(--muted))] mt-2">{t("Measured by consistency and growth, not appearance.")}</p>
</div>

{loading ? (
<p className="text-sm text-[rgb(var(--muted))] px-1">{t("Loading rankings...")}</p>
) : rows.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted))]">{t("No one on the board yet. Be the first.")}</p>
</div>
) : (
<div className="space-y-2.5">
{rows.map((row, idx) => {
const isMe = row.username === currentUsername;
const top = idx < 3;
return (
<div
key={row.username + idx}
className="rounded-2xl px-4 py-3.5 flex items-center gap-4"
style={
isMe
? {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))',
border: '1px solid rgb(var(--gold) / 0.4)',
boxShadow: '0 0 14px rgb(var(--gold) / 0.12)',
}
: cardStyle
}
>
<span
className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold flex-shrink-0"
style={{
background: top ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--muted) / 0.1)',
color: top ? 'rgb(var(--gold))' : 'rgb(var(--muted))',
}}
>
{idx === 0 ? <Trophy className="w-4 h-4" /> : idx + 1}
</span>
<div className="flex-1 min-w-0">
<p className={`text-sm truncate ${isMe ? 'text-[rgb(var(--gold))] font-medium' : 'text-[rgb(var(--muted-hover))]'}`}>
{row.username}{' '}
{isMe && <span className="text-[10px] text-[rgb(var(--muted))]">{t("(you)")}</span>}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-0.5">{t('Level {n}', { n: row.level })}</p>
</div>
<div className="flex items-center gap-1 text-[rgb(var(--muted))] text-xs">
<Flame className="w-3 h-3" />
{row.current_streak}
</div>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))] w-16 text-right">
{row.total_xp} XP
</span>
</div>
);
})}
</div>
)}
</div>
);
}

