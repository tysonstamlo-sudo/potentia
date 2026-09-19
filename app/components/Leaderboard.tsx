'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Flame } from 'lucide-react';

type LeaderboardRow = {
username: string;
total_xp: number;
level: number;
current_streak: number;
};

export default function Leaderboard() {
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
<div className="space-y-10 font-body">
<div className="pb-6 border-b border-[#7A6E5D]/20">
<span className="text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase block mb-2">Standing</span>
<h2 className="font-display text-2xl text-[#C9A24B] font-light">Rankings</h2>
<p className="text-xs text-[#7A6E5D] mt-2">Measured by consistency and growth, not appearance.</p>
</div>

{loading ? (
<p className="text-sm text-[#7A6E5D]">Loading rankings...</p>
) : rows.length === 0 ? (
<p className="text-sm text-[#7A6E5D]">No one on the board yet — be the first.</p>
) : (
<div className="border-t border-[#7A6E5D]/20">
{rows.map((row, idx) => {
const isMe = row.username === currentUsername;
return (
<div
key={row.username + idx}
className={`border-b border-[#7A6E5D]/20 py-4 flex items-center gap-5 ${
isMe ? 'bg-[#C9A24B]/[0.05]' : ''
}`}
>
<span className={`font-display text-lg w-8 flex-shrink-0 ${idx < 3 ? 'text-[#C9A24B]' : 'text-[#7A6E5D]/60'}`}>
{idx + 1}
</span>
{idx === 0 ? (
<Trophy className="w-4 h-4 text-[#C9A24B] flex-shrink-0" />
) : (
<div className="w-4 flex-shrink-0" />
)}
<div className="flex-1 min-w-0">
<p className={`font-body text-sm ${isMe ? 'text-[#C9A24B] font-medium' : 'text-[#C9A24B]/90'}`}>
{row.username} {isMe && <span className="text-[10px] text-[#7A6E5D]">(you)</span>}
</p>
<p className="font-body text-[11px] text-[#7A6E5D] mt-0.5">Rank {row.level}</p>
</div>
<div className="flex items-center gap-1.5 text-[#7A6E5D] text-xs">
<Flame className="w-3 h-3" />
{row.current_streak}
</div>
<span className="font-display text-sm text-[#C9A24B] w-16 text-right">{row.total_xp} XP</span>
</div>
);
})}
</div>
)}
</div>
);
}

