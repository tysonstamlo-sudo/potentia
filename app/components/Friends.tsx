'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Check, X, Search, Flame } from 'lucide-react';

type MyStats = { totalXP: number; level: number; streak: number };

type SearchResult = { id: string; username: string; total_xp: number; level: number };
type PendingRequest = { id: string; requester_id: string; username: string };
type Friend = { id: string; username: string; total_xp: number; level: number; current_streak: number };

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
if (diff === 0) return { text: 'Even', color: 'text-[#7A6E5D]' };
if (diff > 0) return { text: `+${diff} ahead`, color: 'text-[#C9A24B]' };
return { text: `${Math.abs(diff)} behind`, color: 'text-[#8B4A3D]' };
};

return (
<div className="space-y-10 font-body">
<div className="pb-6 border-b border-[#7A6E5D]/20">
<span className="text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase block mb-2">Circle</span>
<h2 className="font-display text-2xl text-[#C9A24B] font-light">Friends</h2>
</div>

<div className="relative">
<Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E5D]" />
<input
type="text"
value={query}
onChange={e => searchUsers(e.target.value)}
placeholder="Search by username"
className="w-full bg-transparent border-b border-[#7A6E5D]/30 py-2.5 pl-6 pr-2 text-sm text-[#C9A24B] placeholder:text-[#7A6E5D]/60 focus:outline-none focus:border-[#C9A24B] transition-all"
/>
</div>

{results.length > 0 && (
<div className="space-y-2">
{results.map(r => {
const alreadyFriend = friends.some(f => f.id === r.id);
const alreadySent = sentTo.has(r.id);
return (
<div key={r.id} className="flex items-center justify-between py-3 border-b border-[#7A6E5D]/10">
<div>
<p className="text-sm text-[#C9A24B]">{r.username}</p>
<p className="text-[11px] text-[#7A6E5D]">Rank {r.level} · {r.total_xp} XP</p>
</div>
{alreadyFriend ? (
<span className="text-[11px] text-[#7A6E5D]">Friends</span>
) : alreadySent ? (
<span className="text-[11px] text-[#7A6E5D]">Requested</span>
) : (
<button
onClick={() => sendRequest(r.id)}
className="flex items-center gap-1.5 text-[11px] text-[#C9A24B] border border-[#C9A24B]/40 hover:border-[#C9A24B] rounded-sm px-3 py-1.5 transition-all"
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
<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-4">Requests</span>
<div className="space-y-2">
{pending.map(p => (
<div key={p.id} className="flex items-center justify-between py-3 border-b border-[#7A6E5D]/10">
<p className="text-sm text-[#C9A24B]">{p.username}</p>
<div className="flex gap-2">
<button
onClick={() => respondToRequest(p.id, true)}
className="w-7 h-7 flex items-center justify-center border border-[#C9A24B]/40 hover:border-[#C9A24B] rounded-sm text-[#C9A24B] transition-all"
>
<Check className="w-3.5 h-3.5" />
</button>
<button
onClick={() => respondToRequest(p.id, false)}
className="w-7 h-7 flex items-center justify-center border border-[#7A6E5D]/30 hover:border-[#7A6E5D]/60 rounded-sm text-[#7A6E5D] transition-all"
>
<X className="w-3.5 h-3.5" />
</button>
</div>
</div>
))}
</div>
</div>
)}

<div>
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-4">
Your Circle {friends.length > 0 && `(${friends.length})`}
</span>
{loading ? (
<p className="text-sm text-[#7A6E5D]">Loading...</p>
) : friends.length === 0 ? (
<p className="text-sm text-[#7A6E5D]">No friends yet — search above to add someone.</p>
) : (
<div className="space-y-4">
{friends.map(f => {
const xpDiff = diffLabel(myStats.totalXP, f.total_xp);
return (
<div key={f.id} className="border border-[#7A6E5D]/20 rounded-sm p-5">
<div className="flex items-center justify-between mb-3">
<p className="text-sm text-[#C9A24B] font-medium">{f.username}</p>
<div className="flex items-center gap-1.5 text-[#7A6E5D] text-xs">
<Flame className="w-3 h-3" />
{f.current_streak}
</div>
</div>
<div className="flex items-center justify-between text-xs">
<span className="text-[#7A6E5D]">Rank {f.level} · {f.total_xp} XP</span>
<span className={xpDiff.color}>{xpDiff.text}</span>
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

