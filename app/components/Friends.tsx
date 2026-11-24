'use client';

// app/components/Friends.tsx — your circle: friend leaderboard, this week's head-to-head, each friend's progress,
// friend requests and search. Opening a friend's progress tells them (once a day) "X checked your progress".

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { notify } from '../../lib/notify';
import { faceTier } from '../../lib/faceAnalysis';
import { Sheet } from './shopShared';
import { UserPlus, Check, X, Search, Flame, Trophy, TrendingUp, TrendingDown, Lock, Loader2, ChevronRight } from 'lucide-react';

type MyStats = { totalXP: number; level: number; streak: number };
type SearchResult = { id: string; username: string; total_xp: number; level: number };
type PendingRequest = { id: string; requester_id: string; username: string };
type BoardRow = {
user_id: string;
username: string;
avatar_url: string | null;
gender: string | null;
level: number;
total_xp: number;
streak: number;
score: number | null;
week_change: number | null;
scans: number;
last_scan_at: string | null;
is_me: boolean;
score_hidden: boolean;
};
type FriendProgress = {
username: string;
avatar_url: string | null;
gender: string | null;
level: number;
total_xp: number;
streak: number;
score_hidden: boolean;
score: number | null;
week_change: number | null;
history: { at: string; score: number }[];
};

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};
const meStyle: React.CSSProperties = { ...cardStyle, border: '1px solid rgb(var(--gold) / 0.45)', background: 'rgb(var(--gold) / 0.08)' };

const fmtChange = (n: number | null) => (n == null ? '–' : `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}`);
const tierOf = (score: number | null, gender: string | null, scans: number) =>
score == null ? null : faceTier(Number(score), gender === 'female' ? 'female' : 'male', scans).label;

function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
return url ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={url} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
) : (
<span
className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-[rgb(var(--gold))]"
style={{ width: size, height: size, background: 'rgb(var(--gold) / 0.14)', fontSize: size * 0.4 }}
>
{name.slice(0, 1).toUpperCase()}
</span>
);
}

/** Small score line for a friend's last scans. */
function Sparkline({ points }: { points: { score: number }[] }) {
if (points.length < 2) return null;
const w = 300;
const h = 70;
const vals = points.map(p => Number(p.score));
const lo = Math.min(...vals) - 0.3;
const hi = Math.max(...vals) + 0.3;
const xy = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - ((v - lo) / (hi - lo)) * h]);
const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
return (
<svg role="img" aria-label="Score over their last scans" viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
<path d={d} fill="none" stroke="rgb(var(--gold))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
{xy.map(([x, y], i) => (
<circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 4.5 : 2.5} fill="rgb(var(--gold))" />
))}
</svg>
);
}

function FriendSheet({ friendId, me, onClose }: { friendId: string; me: BoardRow | null; onClose: () => void }) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [p, setP] = useState<FriendProgress | null>(null);
const [error, setError] = useState('');

useEffect(() => {
let alive = true;
supabase.rpc('friend_progress', { p_friend: friendId }).then(({ data, error: err }: { data: unknown; error: unknown }) => {
if (!alive) return;
if (err) return setError(L('Could not load. Try again.', 'ဖွင့်လို့ မရပါ။ ပြန်ကြိုးစားပါ။'));
setP(data as FriendProgress);
notify('friend_viewed', friendId); // "X checked your progress" (max once a day per friend)
});
return () => {
alive = false;
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [friendId]);

const diff = p && me && p.score != null && me.score != null ? Math.round((Number(me.score) - Number(p.score)) * 10) / 10 : null;

return (
<Sheet onClose={onClose} title={p?.username ?? L('Friend', 'သူငယ်ချင်း')}>
<div className="space-y-4 font-body">
{!p && !error && (
<div className="py-10 flex justify-center">
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
</div>
)}
{error && <p className="text-sm text-center" style={{ color: 'rgb(var(--err))' }}>{error}</p>}
{p && (
<>
<div className="rounded-2xl p-5 flex items-center gap-4" style={cardStyle}>
<Avatar url={p.avatar_url} name={p.username} size={56} />
<div className="flex-1 min-w-0">
<p className="font-display text-lg text-[rgb(var(--gold))] font-semibold truncate">{p.username}</p>
<p className="text-[12px] text-[rgb(var(--muted-hover))]">
{L('Level', 'Level')} {p.level} · {p.total_xp.toLocaleString('en-US')} XP ·{' '}
<Flame className="w-3 h-3 inline -mt-0.5" /> {p.streak}
</p>
</div>
</div>

{p.score_hidden ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<Lock className="w-5 h-5 mx-auto mb-2 text-[rgb(var(--muted))]" />
<p className="text-sm text-[rgb(var(--muted-hover))]">{L(`${p.username} keeps their score private.`, `${p.username} က အမှတ်ကို လျှို့ဝှက်ထားပါတယ်။`)}</p>
</div>
) : p.score == null ? (
<div className="rounded-2xl p-6 text-center text-sm text-[rgb(var(--muted-hover))]" style={cardStyle}>
{L('No camera scan yet.', 'Camera scan မလုပ်ရသေးပါ။')}
</div>
) : (
<div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
<div className="grid grid-cols-3 gap-3 text-center">
<div>
<p className="font-display text-2xl font-semibold text-[rgb(var(--gold))]">{Number(p.score).toFixed(1)}</p>
<p className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{L('Score', 'အမှတ်')}</p>
</div>
<div>
<p className="font-display text-2xl font-semibold" style={{ color: (p.week_change ?? 0) >= 0 ? 'rgb(var(--gold))' : 'rgb(var(--err))' }}>
{fmtChange(p.week_change)}
</p>
<p className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide">{L('This week', 'ဒီအပတ်')}</p>
</div>
<div>
<p className="text-[13px] font-semibold text-[rgb(var(--gold))] leading-tight pt-1.5">{tierOf(p.score, p.gender, p.history.length)}</p>
<p className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-wide mt-1">{L('Tier', 'အဆင့်')}</p>
</div>
</div>
<Sparkline points={p.history} />
{diff != null && (
<p
className="text-center text-[13px] font-medium rounded-xl py-2.5"
style={{ background: diff >= 0 ? 'rgb(var(--gold) / 0.1)' : 'rgb(var(--err) / 0.1)', color: diff >= 0 ? 'rgb(var(--gold))' : 'rgb(var(--err))' }}
>
{diff > 0
? L(`You're ${diff.toFixed(1)} ahead. Keep it.`, `သင် ${diff.toFixed(1)} ရှေ့မှာ ရှိနေပါတယ်။ ဆက်ထိန်းပါ။`)
: diff < 0
? L(`You're ${Math.abs(diff).toFixed(1)} behind. Scan and catch up.`, `သင် ${Math.abs(diff).toFixed(1)} နောက်ကျနေပါတယ်။ Scan လုပ်ပြီး လိုက်ပါ။`)
: L('Dead even.', 'အမှတ်တူနေပါတယ်။')}
</p>
)}
</div>
)}
<p className="text-[10px] text-center text-[rgb(var(--muted))]">
{L(`${p.username} gets a notification that you checked.`, `သင်ကြည့်သွားကြောင်း ${p.username} ကို အသိပေးပါမယ်။`)}
</p>
</>
)}
</div>
</Sheet>
);
}

export default function Friends({ myStats }: { myStats: MyStats }) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [userId, setUserId] = useState<string | null>(null);
const [query, setQuery] = useState('');
const [results, setResults] = useState<SearchResult[]>([]);
const [pending, setPending] = useState<PendingRequest[]>([]);
const [board, setBoard] = useState<BoardRow[]>([]);
const [sentTo, setSentTo] = useState<Set<string>>(new Set<string>());
const [loading, setLoading] = useState(true);
const [view, setView] = useState<'score' | 'week' | 'streak'>('score');
const [open, setOpen] = useState<string | null>(null);

const load = useCallback(async (uid: string) => {
const [{ data: friendships }, { data: rows }] = await Promise.all([
supabase.from('friendships').select('id, requester_id, addressee_id, status').or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
supabase.rpc('my_friends_board'),
]);
setBoard(((rows ?? []) as BoardRow[]).map(r => ({ ...r, score: r.score == null ? null : Number(r.score), week_change: r.week_change == null ? null : Number(r.week_change) })));
const list = (friendships ?? []) as { id: string; requester_id: string; addressee_id: string; status: string }[];
setSentTo(new Set<string>(list.filter(f => f.requester_id === uid).map(f => f.addressee_id)));
const incoming = list.filter(f => f.status === 'pending' && f.addressee_id === uid);
if (incoming.length) {
const { data: names } = await supabase.from('leaderboard').select('id, username').in('id', incoming.map(f => f.requester_id));
const byId = new Map<string, string>(((names ?? []) as { id: string; username: string }[]).map(n => [n.id, n.username]));
setPending(incoming.map(f => ({ id: f.id, requester_id: f.requester_id, username: byId.get(f.requester_id) ?? 'Unknown' })));
} else setPending([]);
}, []);

useEffect(() => {
(async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) return;
setUserId(session.user.id);
await load(session.user.id);
setLoading(false);
})();
}, [load]);

const searchUsers = async (q: string) => {
setQuery(q);
if (!q.trim() || !userId) return setResults([]);
const { data } = await supabase.from('leaderboard').select('id, username, total_xp, level').ilike('username', `%${q}%`).neq('id', userId).limit(10);
setResults((data ?? []) as SearchResult[]);
};

const sendRequest = async (addresseeId: string) => {
if (!userId) return;
await supabase.from('friendships').insert({ requester_id: userId, addressee_id: addresseeId });
setSentTo(prev => new Set<string>(prev).add(addresseeId));
};

const respond = async (friendshipId: string, accept: boolean) => {
if (!userId) return;
await supabase.from('friendships').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', friendshipId);
await load(userId);
};

const me = board.find(r => r.is_me) ?? null;
const friendsCount = board.filter(r => !r.is_me).length;
const key = (r: BoardRow) => (view === 'score' ? r.score ?? -1 : view === 'week' ? r.week_change ?? -99 : r.streak);
const ranked = [...board].sort((a, b) => key(b) - key(a));
const myPlace = ranked.findIndex(r => r.is_me) + 1;
const above = myPlace > 1 ? ranked[myPlace - 2] : null;

const value = (r: BoardRow) => {
if (view === 'streak') return `${r.streak}`;
if (r.score_hidden) return '🔒';
if (view === 'week') return fmtChange(r.week_change);
return r.score == null ? '–' : r.score.toFixed(1);
};

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{L('Circle', 'အသိုင်းအဝိုင်း')}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{L('Friends', 'သူငယ်ချင်းများ')}</h2>
{friendsCount > 0 && myPlace > 0 && (
<p className="text-[13px] text-[rgb(var(--muted-hover))] mt-2">
{myPlace === 1
? L(`You're #1 of ${board.length}. Stay there.`, `${board.length} ယောက်ထဲမှာ သင် နံပါတ် ၁ ပါ။ ဆက်ထိန်းပါ။`)
: L(`You're #${myPlace} of ${board.length}. ${above?.username ?? ''} is right above you.`, `${board.length} ယောက်ထဲမှာ သင် နံပါတ် ${myPlace} ပါ။ ${above?.username ?? ''} က သင့်အပေါ်မှာ ရှိနေတယ်။`)}
</p>
)}
</div>

{/* ---------- friend leaderboard ---------- */}
{friendsCount > 0 && (
<div className="space-y-3">
<div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={cardStyle}>
{(
[
['score', L('Score', 'အမှတ်'), Trophy],
['week', L('This week', 'ဒီအပတ်'), TrendingUp],
['streak', L('Streak', 'Streak'), Flame],
] as const
).map(([k, label, Icon]) => (
<button
key={k}
onClick={() => setView(k)}
className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium"
style={{ background: view === k ? 'rgb(var(--gold))' : 'transparent', color: view === k ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))' }}
>
<Icon className="w-3.5 h-3.5" /> {label}
</button>
))}
</div>
{view === 'week' && (
<p className="text-[11px] text-[rgb(var(--muted))] px-1">
{L('Head-to-head: who improved most in the last 7 days. The winner is announced on Sunday.', 'ပြိုင်ပွဲ: ပြီးခဲ့တဲ့ ၇ ရက်အတွင်း ဘယ်သူ အတိုးတက်ဆုံးလဲ။ တနင်္ဂနွေနေ့ အနိုင်ရသူကို ကြေညာပါမယ်။')}
</p>
)}
<div className="space-y-2">
{ranked.map((r, i) => (
<button
key={r.user_id}
onClick={() => !r.is_me && setOpen(r.user_id)}
disabled={r.is_me}
className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
style={r.is_me ? meStyle : cardStyle}
>
<span className="w-6 text-center font-display text-sm text-[rgb(var(--muted-hover))]">{i + 1}</span>
<Avatar url={r.avatar_url} name={r.username} />
<span className="flex-1 min-w-0">
<span className="block text-sm text-[rgb(var(--gold))] font-medium truncate">
{r.username} {r.is_me && <span className="text-[10px] text-[rgb(var(--muted))]">{L('(you)', '(သင်)')}</span>}
</span>
<span className="block text-[11px] text-[rgb(var(--muted))] truncate">
{r.score_hidden ? L('Score private', 'အမှတ် လျှို့ဝှက်') : tierOf(r.score, r.gender, r.scans) ?? L('No scan yet', 'Scan မလုပ်ရသေး')} · <Flame className="w-3 h-3 inline -mt-0.5" /> {r.streak}
</span>
</span>
<span
className="font-display text-lg font-semibold"
style={{ color: view === 'week' && (r.week_change ?? 0) < 0 ? 'rgb(var(--err))' : 'rgb(var(--gold))' }}
>
{value(r)}
</span>
{!r.is_me && <ChevronRight className="w-4 h-4 text-[rgb(var(--muted))]" />}
</button>
))}
</div>
{me && me.week_change != null && me.week_change < 0 && (
<p className="flex items-center gap-1.5 text-[12px] px-1" style={{ color: 'rgb(var(--err))' }}>
<TrendingDown className="w-3.5 h-3.5" /> {L('Your score dropped this week. Scan again in good light.', 'ဒီအပတ် သင့်အမှတ် ကျသွားပါတယ်။ အလင်းကောင်းကောင်းမှာ ပြန် scan လုပ်ပါ။')}
</p>
)}
</div>
)}

{/* ---------- search ---------- */}
<div className="relative">
<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
<input
type="text"
value={query}
onChange={e => searchUsers(e.target.value)}
placeholder={L('Search by username', 'အသုံးပြုသူအမည်ဖြင့် ရှာပါ')}
aria-label={L('Search by username', 'အသုံးပြုသူအမည်ဖြင့် ရှာပါ')}
className="w-full rounded-xl py-3 pl-11 pr-4 text-sm text-[rgb(var(--gold))] placeholder:text-[rgb(var(--muted))] focus:outline-none"
style={{ ...cardStyle, fontSize: 16 }}
/>
</div>

{results.length > 0 && (
<div className="rounded-2xl overflow-hidden" style={cardStyle}>
{results.map(r => {
const alreadyFriend = board.some(f => f.user_id === r.id);
const alreadySent = sentTo.has(r.id);
return (
<div key={r.id} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgb(var(--muted) / 0.1)' }}>
<div>
<p className="text-sm text-[rgb(var(--gold))]">{r.username}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">
Level {r.level} · {r.total_xp} XP
</p>
</div>
{alreadyFriend ? (
<span className="text-[11px] text-[rgb(var(--muted))]">{L('Friends', 'သူငယ်ချင်း')}</span>
) : alreadySent ? (
<span className="text-[11px] text-[rgb(var(--muted))]">{L('Requested', 'တောင်းဆိုပြီး')}</span>
) : (
<button
onClick={() => sendRequest(r.id)}
className="flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3.5 py-2"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<UserPlus className="w-3.5 h-3.5" /> {L('Add', 'ထည့်မယ်')}
</button>
)}
</div>
);
})}
</div>
)}

{pending.length > 0 && (
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">{L('Requests', 'တောင်းဆိုမှုများ')}</span>
<div className="space-y-3">
{pending.map(p => (
<div key={p.id} className="flex items-center justify-between">
<p className="text-sm text-[rgb(var(--gold))]">{p.username}</p>
<div className="flex gap-2">
<button aria-label={L('Accept', 'လက်ခံမယ်')} onClick={() => respond(p.id, true)} className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}>
<Check className="w-4 h-4" />
</button>
<button aria-label={L('Decline', 'ငြင်းမယ်')} onClick={() => respond(p.id, false)} className="w-10 h-10 flex items-center justify-center rounded-lg text-[rgb(var(--muted))]" style={{ background: 'rgb(var(--muted) / 0.12)' }}>
<X className="w-4 h-4" />
</button>
</div>
</div>
))}
</div>
</div>
)}

{!loading && friendsCount === 0 && (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted-hover))]">
{L('No friends yet. Add someone above and compete on score, streak and weekly progress.', 'သူငယ်ချင်း မရှိသေးပါ။ အပေါ်မှာ ရှာပြီး ထည့်ပါ။ အမှတ်၊ streak နဲ့ အပတ်စဉ် တိုးတက်မှုမှာ ပြိုင်ကြပါ။')}
</p>
<p className="text-[11px] text-[rgb(var(--muted))] mt-2">
{L(`Your level ${myStats.level} · ${myStats.totalXP} XP · ${myStats.streak}-day streak`, `သင့် level ${myStats.level} · ${myStats.totalXP} XP · streak ${myStats.streak} ရက်`)}
</p>
</div>
)}

{open && <FriendSheet friendId={open} me={me} onClose={() => setOpen(null)} />}
</div>
);
}

