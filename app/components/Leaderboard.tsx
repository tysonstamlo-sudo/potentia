'use client';

// app/components/Leaderboard.tsx — Looks ranking (by steady face score) and Level ranking.

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Flame, Crown, EyeOff, Eye, Camera } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { faceTier, type Gender } from '../../lib/faceAnalysis';

type LevelRow = { username: string; total_xp: number; level: number; current_streak: number };
type LooksRow = { rank: number; username: string; score: number; level: number; is_me: boolean; scans?: number; days_left?: number };

/** Scan at least this often to stay on the looks ranking (keep in sync with rank_days() in rank-expiry.sql). */
const RANK_DAYS = 14;

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};
const meStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.1), rgb(var(--surface) / 0.4))',
border: '1px solid rgb(var(--gold) / 0.4)',
boxShadow: '0 0 14px rgb(var(--gold) / 0.12)',
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
return (
<button
onClick={onClick}
className="text-xs rounded-full px-4 py-2 transition-all"
style={{
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{children}
</button>
);
}

function RankBadge({ rank }: { rank: number }) {
const top = rank <= 3;
return (
<span
className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold flex-shrink-0"
style={{
background: top ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--muted) / 0.1)',
color: top ? 'rgb(var(--gold))' : 'rgb(var(--muted))',
}}
>
{rank === 1 ? <Crown className="w-4 h-4" /> : rank}
</span>
);
}

export default function Leaderboard() {
const { t, lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [board, setBoard] = useState<'looks' | 'level'>('looks');
const [gender, setGender] = useState<Gender>('male');
const [userId, setUserId] = useState<string | null>(null);
const [myName, setMyName] = useState('');
const [visible, setVisible] = useState(true);
const [looks, setLooks] = useState<LooksRow[]>([]);
const [levels, setLevels] = useState<LevelRow[]>([]);
const [loading, setLoading] = useState(true);

// who am I, and which board should I see first
useEffect(() => {
const init = async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) return;
setUserId(session.user.id);
const { data: profile } = await supabase
.from('profiles')
.select('username, gender, show_on_looks_board')
.eq('id', session.user.id)
.single();
if (profile?.username) setMyName(profile.username);
if (profile?.gender === 'female') setGender('female');
if (profile && profile.show_on_looks_board === false) setVisible(false);
};
init();
}, []);

const load = useCallback(async () => {
setLoading(true);
if (board === 'looks') {
const { data, error } = await supabase.rpc('looks_leaderboard', { g: gender });
if (error) console.error('looks_leaderboard', error);
setLooks((data as LooksRow[]) ?? []);
} else {
const { data, error } = await supabase
.from('leaderboard')
.select('username, total_xp, level, current_streak')
.order('level', { ascending: false })
.order('total_xp', { ascending: false })
.limit(2000);
if (error) console.error('leaderboard', error);
setLevels((data as LevelRow[]) ?? []);
}
setLoading(false);
}, [board, gender]);

useEffect(() => {
load();
}, [load]);

const toggleVisible = async () => {
if (!userId) return;
const next = !visible;
setVisible(next);
await supabase.from('profiles').update({ show_on_looks_board: next }).eq('id', userId);
load();
};

const me = looks.find(r => r.is_me);

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{t('Standing')}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{t('Rankings')}</h2>
<p className="text-xs text-[rgb(var(--muted))] mt-2">
{board === 'looks'
? L(
`Ranked by face score. Only camera scans count. Scan at least every ${RANK_DAYS} days to keep your place.`,
`မျက်နှာအမှတ်အလိုက် အဆင့်သတ်မှတ်ပါတယ်။ Camera scan ပဲ ထည့်တွက်ပါတယ်။ နေရာမပျောက်အောင် အနည်းဆုံး ${RANK_DAYS} ရက်တစ်ခါ scan လုပ်ပါ။`
)
: t('Ranked by level and consistency.')}
</p>
</div>

{/* board switch */}
<div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={cardStyle}>
{(['looks', 'level'] as const).map(b => (
<button
key={b}
onClick={() => setBoard(b)}
className="text-[13px] py-2.5 rounded-lg transition-all"
style={{
background: board === b ? 'rgb(var(--gold))' : 'transparent',
color: board === b ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: board === b ? 600 : 400,
}}
>
{b === 'looks' ? t('Looks') : t('Level')}
</button>
))}
</div>

{board === 'looks' && (
<div className="flex items-center justify-between gap-3">
<div className="flex gap-2">
<Chip active={gender === 'male'} onClick={() => setGender('male')}>
{t('Men')}
</Chip>
<Chip active={gender === 'female'} onClick={() => setGender('female')}>
{t('Women')}
</Chip>
</div>
<button onClick={toggleVisible} className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--muted-hover))]">
{visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
{visible ? t('You are shown') : t('You are hidden')}
</button>
</div>
)}

{/* my position */}
{board === 'looks' && me && (
<div className="rounded-2xl p-4 flex items-center gap-4" style={meStyle}>
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">#{me.rank}</span>
<div className="flex-1 min-w-0">
<p className="text-sm text-[rgb(var(--gold))] font-medium">{t('Your position')}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
{faceTier(Number(me.score), gender, Number(me.scans ?? 3)).label} · {Number(me.score).toFixed(1)}
</p>
{me.days_left != null && me.days_left <= 5 && (
<p className="text-[11px] mt-1" style={{ color: 'rgb(var(--err))' }}>
{me.days_left <= 1
? L('Your place expires today. Scan now to keep it.', 'သင့်နေရာ ဒီနေ့ ကုန်ပါမယ်။ ဆက်ထိန်းဖို့ အခု scan လုပ်ပါ။')
: L(`Your place expires in ${me.days_left} days. Scan to keep it.`, `သင့်နေရာ ${me.days_left} ရက်အတွင်း ကုန်ပါမယ်။ ဆက်ထိန်းဖို့ scan လုပ်ပါ။`)}
</p>
)}
</div>
</div>
)}
{board === 'looks' && !me && !loading && visible && (
<div className="rounded-2xl p-4 flex items-center gap-3 text-xs text-[rgb(var(--muted-hover))]" style={cardStyle}>
<Camera className="w-4 h-4 text-[rgb(var(--gold))] flex-shrink-0" />
{L(
`Do a camera scan to get on the ranking. Places expire after ${RANK_DAYS} days without a scan.`,
`Ranking ထဲဝင်ဖို့ camera scan လုပ်ပါ။ ${RANK_DAYS} ရက် scan မလုပ်ရင် နေရာ ပျောက်ပါမယ်။`
)}
</div>
)}

{loading ? (
<p className="text-sm text-[rgb(var(--muted))] px-1">{t('Loading rankings...')}</p>
) : board === 'looks' ? (
looks.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted))]">{t('No one on the board yet. Be the first.')}</p>
</div>
) : (
<div className="space-y-2.5">
{looks.map(row => {
const tier = faceTier(Number(row.score), gender, Number(row.scans ?? 3));
return (
<div key={row.username + row.rank} className="rounded-2xl px-4 py-3.5 flex items-center gap-4" style={row.is_me ? meStyle : cardStyle}>
<RankBadge rank={Number(row.rank)} />
<div className="flex-1 min-w-0">
<p className={`text-sm truncate ${row.is_me ? 'text-[rgb(var(--gold))] font-medium' : 'text-[rgb(var(--muted-hover))]'}`}>
{row.username} {row.is_me && <span className="text-[10px] text-[rgb(var(--muted))]">{t('(you)')}</span>}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-0.5">{t('Level {n}', { n: row.level })}</p>
</div>
<span
className="text-[11px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0"
style={{ background: 'rgb(var(--gold) / 0.12)', color: 'rgb(var(--gold))' }}
>
{tier.label}
</span>
<span className="font-display text-base font-bold text-[rgb(var(--gold))] w-10 text-right">
{Number(row.score).toFixed(1)}
</span>
</div>
);
})}
</div>
)
) : levels.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted))]">{t('No one on the board yet. Be the first.')}</p>
</div>
) : (
<div className="space-y-2.5">
{levels.map((row, idx) => {
const isMe = row.username === myName;
return (
<div key={row.username + idx} className="rounded-2xl px-4 py-3.5 flex items-center gap-4" style={isMe ? meStyle : cardStyle}>
<span
className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold flex-shrink-0"
style={{
background: idx < 3 ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--muted) / 0.1)',
color: idx < 3 ? 'rgb(var(--gold))' : 'rgb(var(--muted))',
}}
>
{idx === 0 ? <Trophy className="w-4 h-4" /> : idx + 1}
</span>
<div className="flex-1 min-w-0">
<p className={`text-sm truncate ${isMe ? 'text-[rgb(var(--gold))] font-medium' : 'text-[rgb(var(--muted-hover))]'}`}>
{row.username} {isMe && <span className="text-[10px] text-[rgb(var(--muted))]">{t('(you)')}</span>}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-0.5">{t('Level {n}', { n: row.level })}</p>
</div>
<div className="flex items-center gap-1 text-[rgb(var(--muted))] text-xs">
<Flame className="w-3 h-3" />
{row.current_streak}
</div>
<span className="font-display text-sm font-semibold text-[rgb(var(--gold))] w-16 text-right">{row.total_xp} XP</span>
</div>
);
})}
</div>
)}
</div>
);
}

