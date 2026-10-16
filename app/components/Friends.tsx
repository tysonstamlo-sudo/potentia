'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Check, X, Search, Flame } from 'lucide-react';

type MyStats = { totalXP: number; level: number; streak: number };

type SearchResult = { id: string; username: string; total_xp: number; level: number };
type PendingRequest = { id: string; requester_id: string; username: string };
type Friend = { id: string; username: string; total_xp: number; level: number; current_streak: number };

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

export default function Friends({ myStats }: { myStats: MyStats }) {
const [userId, setUserId] = useState<string | null>(null);
const [query, setQuery] = useState('');
const [results, setResults] = useState<SearchResult[]>([]);
const [pending, setPending] = useState<PendingRequest[]>([]);
const [friends, setFriends] = useState<Friend[]>([]);
const [sentTo, setSentTo] = useState<Set<string>>(new Set());
const [loading, setLoading] = useState(true);

const loadFriendsAndRequests = useCallback(async (uid: string) => {
const { data: friendships } = await supabase
.from('friendships')
.select('id, requester_id, addressee_id, status')
.or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

if (!friendships) return;

const incoming = friendships.filter(f => f.status === 'pending' && f.addressee_id === uid);
const accepted = friendships.filter(f => f.status === 'accepted');
const alreadySent = new Set(
friendships.filter(f => f.requester_id === uid).map(f => f.addressee_id)
);
setSentTo(alreadySent);

if (incoming.length > 0) {
const requesterIds = incoming.map(f => f.requester_id);
const { data: requesterProfiles } = await supabase
.from('leaderboard')
.select('id, username')
.in('id', requesterIds);
setPending(
incoming.map(f => ({
id: f.id,
requester_id: f.requester_id,
username: requesterProfiles?.find(p => p.id === f.requester_id)?.username ?? 'Unknown',
}))
);
} else {
setPending([]);
}

if (accepted.length > 0) {
const friendIds = accepted.map(f => (f.requester_id === uid ? f.addressee_id : f.requester_id));
const { data: friendProfiles } = await supabase
.from('leaderboard')
.select('id, username, total_xp, level, current_streak')
.in('id', friendIds);
setFriends(friendProfiles ?? []);
} else {
setFriends([]);
}
}, []);

useEffect(() => {
const init = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
setUserId(session.user.id);
await loadFriendsAndRequests(session.user.id);
setLoading(false);
};
init();
}, [loadFriendsAndRequests]);

const searchUsers = async (q: string) => {
setQuery(q);
if (!q.trim() || !userId) {
setResults([]);
return;
}
const { data } = await supabase
.from('leaderboard')
.select('id, username, total_xp, level')
.ilike('username', `%${q}%`)
.neq('id', userId)
.limit(10);
setResults(data ?? []);
};

const sendRequest = async (addresseeId: string) => {
if (!userId) return;
await supabase.from('friendships').insert({ requester_id: userId, addressee_id: addresseeId });
setSentTo(prev => new Set(prev).add(addresseeId));
};

const respondToRequest = async (friendshipId: string, accept: boolean) => {
if (!userId) return;
await supabase
.from('friendships')
.update({ status: accept ? 'accepted' : 'rejected' })
.eq('id', friendshipId);
await loadFriendsAndRequests(userId);
};

const diffLabel = (mine: number, theirs: number) => {
const diff = mine - theirs;
if (diff === 0) return { text: 'Even', color: 'rgb(var(--muted))' };
if (diff > 0) return { text: `+${diff} ahead`, color: 'rgb(var(--gold))' };
return { text: `${Math.abs(diff)} behind`, color: 'rgb(var(--err))' };
};

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">Circle</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">Friends</h2>
</div>

<div className="relative">
<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
<input
type="text"
value={query}
onChange={e => searchUsers(e.target.value)}
placeholder="Search by username"
className="w-full rounded-xl py-3 pl-11 pr-4 text-sm text-[rgb(var(--gold))] placeholder:text-[rgb(var(--muted))] focus:outline-none transition-all"
style={{ ...cardStyle, fontSize: 16 }}
/>
</div>

{results.length > 0 && (
<div className="rounded-2xl overflow-hidden" style={cardStyle}>
{results.map(r => {
const alreadyFriend = friends.some(f => f.id === r.id);
const alreadySent = sentTo.has(r.id);
return (
<div
key={r.id}
className="flex items-center justify-between px-5 py-3.5"
style={{ borderBottom: '1px solid rgb(var(--muted) / 0.1)' }}
>
<div>
<p className="text-sm text-[rgb(var(--gold))]">{r.username}</p>
<p className="text-[11px] text-[rgb(var(--muted))]">Rank {r.level} · {r.total_xp} XP</p>
</div>
{alreadyFriend ? (
<span className="text-[11px] text-[rgb(var(--muted))]">Friends</span>
) : alreadySent ? (
<span className="text-[11px] text-[rgb(var(--muted))]">Requested</span>
) : (
<button
onClick={() => sendRequest(r.id)}
className="flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-3 py-1.5"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<UserPlus className="w-3 h-3" />
Add
</button>
)}
</div>
);
})}
</div>
)}

{pending.length > 0 && (
<div className="rounded-2xl p-5" style={cardStyle}>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3">Requests</span>
<div className="space-y-3">
{pending.map(p => (
<div key={p.id} className="flex items-center justify-between">
<p className="text-sm text-[rgb(var(--gold))]">{p.username}</p>
<div className="flex gap-2">
<button
onClick={() => respondToRequest(p.id, true)}
className="w-8 h-8 flex items-center justify-center rounded-lg"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Check className="w-4 h-4" />
</button>
<button
onClick={() => respondToRequest(p.id, false)}
className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgb(var(--muted))]"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
>
<X className="w-4 h-4" />
</button>
</div>
</div>
))}
</div>
</div>
)}

<div>
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-3 px-1">
Your Circle {friends.length > 0 && `(${friends.length})`}
</span>
{loading ? (
<p className="text-sm text-[rgb(var(--muted))] px-1">Loading...</p>
) : friends.length === 0 ? (
<div className="rounded-2xl p-6 text-center" style={cardStyle}>
<p className="text-sm text-[rgb(var(--muted))]">No friends yet. Search above to add someone.</p>
</div>
) : (
<div className="space-y-3">
{friends.map(f => {
const xpDiff = diffLabel(myStats.totalXP, f.total_xp);
return (
<div key={f.id} className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center justify-between mb-3">
<p className="text-sm text-[rgb(var(--gold))] font-medium">{f.username}</p>
<div className="flex items-center gap-1.5 text-[rgb(var(--muted))] text-xs">
<Flame className="w-3 h-3" />
{f.current_streak}
</div>
</div>
<div className="flex items-center justify-between text-xs">
<span className="text-[rgb(var(--muted))]">Rank {f.level} · {f.total_xp} XP</span>
<span style={{ color: xpDiff.color }}>{xpDiff.text}</span>
</div>
</div>
);
})}
</div>
)}
</div>
</div>
);
}

