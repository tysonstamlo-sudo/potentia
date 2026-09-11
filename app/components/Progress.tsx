'use client';

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, TrendingUp, Target, Award } from 'lucide-react';

type ProgressProps = {
totalXP: number;
level: number;
streak: number;
};

const xpData = [
{ day: 'Mon', xp: 180 },
{ day: 'Tue', xp: 220 },
{ day: 'Wed', xp: 150 },
{ day: 'Thu', xp: 270 },
{ day: 'Fri', xp: 200 },
{ day: 'Sat', xp: 240 },
{ day: 'Sun', xp: 190 },
];

const habitData = [
{ day: 'Mon', completed: 4 },
{ day: 'Tue', completed: 5 },
{ day: 'Wed', completed: 3 },
{ day: 'Thu', completed: 5 },
{ day: 'Fri', completed: 4 },
{ day: 'Sat', completed: 5 },
{ day: 'Sun', completed: 4 },
];

const scanHistory = [
{ date: 'Jul 1', skin: 72, body: 65 },
{ date: 'Jul 8', skin: 75, body: 68 },
{ date: 'Jul 15', skin: 79, body: 70 },
{ date: 'Jul 22', skin: 81, body: 74 },
{ date: 'Jul 29', skin: 84, body: 76 },
];

function CustomTooltip({ active, payload, label }: any) {
if (active && payload && payload.length) {
return (
<div className="bg-[#0D0D0D] border border-[#7A6E5D]/30 rounded-sm px-3 py-2 text-xs font-body">
<p className="text-[#7A6E5D] mb-1">{label}</p>
{payload.map((entry: any, idx: number) => (
<p key={idx} className="text-[#C9A24B] font-medium">
{entry.name}: {entry.value}
</p>
))}
</div>
);
}
return null;
}

export default function Progress({ totalXP, level, streak }: ProgressProps) {
const XP_PER_LEVEL = 270;
const avgCompletion = Math.round((habitData.reduce((sum, d) => sum + d.completed, 0) / (habitData.length * 5)) * 100);

return (
<div className="space-y-12 font-body">
{/* Header */}
<div className="pb-6 border-b border-[#7A6E5D]/20">
<span className="text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase block mb-2">Record</span>
<h2 className="font-display text-2xl text-[#C9A24B] font-light">Your Progress</h2>
</div>

{/* Summary stats — real data */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
<div>
<div className="flex items-center gap-2 mb-3">
<Flame className="w-3.5 h-3.5 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Streak</span>
</div>
<div className="font-display text-3xl text-[#C9A24B]">{streak}</div>
</div>
<div>
<div className="flex items-center gap-2 mb-3">
<TrendingUp className="w-3.5 h-3.5 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Total XP</span>
</div>
<div className="font-display text-3xl text-[#C9A24B]">{totalXP}</div>
</div>
<div>
<div className="flex items-center gap-2 mb-3">
<Target className="w-3.5 h-3.5 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">XP to Next Rank</span>
</div>
<div className="font-display text-3xl text-[#C9A24B]">{totalXP % XP_PER_LEVEL}<span className="text-sm text-[#7A6E5D]">/{XP_PER_LEVEL}</span></div>
</div>
<div>
<div className="flex items-center gap-2 mb-3">
<Award className="w-3.5 h-3.5 text-[#C9A24B]" />
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Rank</span>
</div>
<div className="font-display text-3xl text-[#C9A24B]">{level}</div>
</div>
</div>

{/* XP Trend — sample data, noted */}
<div className="border-t border-[#7A6E5D]/20 pt-8">
<div className="flex items-center justify-between mb-6">
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">XP — Last 7 Days</span>
<span className="text-[9px] text-[#7A6E5D]/60 italic">sample trend</span>
</div>
<ResponsiveContainer width="100%" height={220}>
<LineChart data={xpData}>
<CartesianGrid strokeDasharray="1 6" stroke="#7A6E5D" strokeOpacity={0.2} vertical={false} />
<XAxis dataKey="day" stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="xp" stroke="#C9A24B" strokeWidth={1.5} dot={{ fill: '#C9A24B', r: 3 }} />
</LineChart>
</ResponsiveContainer>
</div>

{/* Habit Completion */}
<div className="border-t border-[#7A6E5D]/20 pt-8">
<div className="flex items-center justify-between mb-6">
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Missions Completed</span>
<span className="text-[9px] text-[#7A6E5D]/60 italic">sample trend</span>
</div>
<ResponsiveContainer width="100%" height={220}>
<BarChart data={habitData}>
<CartesianGrid strokeDasharray="1 6" stroke="#7A6E5D" strokeOpacity={0.2} vertical={false} />
<XAxis dataKey="day" stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} domain={[0, 5]} />
<Tooltip content={<CustomTooltip />} />
<Bar dataKey="completed" fill="#C9A24B" radius={[2, 2, 0, 0]} name="Completed" />
</BarChart>
</ResponsiveContainer>
</div>

{/* Scan Score History */}
<div className="border-t border-[#7A6E5D]/20 pt-8">
<div className="flex items-center justify-between mb-6">
<span className="text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Reading History</span>
<span className="text-[9px] text-[#7A6E5D]/60 italic">sample trend</span>
</div>
<ResponsiveContainer width="100%" height={220}>
<LineChart data={scanHistory}>
<CartesianGrid strokeDasharray="1 6" stroke="#7A6E5D" strokeOpacity={0.2} vertical={false} />
<XAxis dataKey="date" stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke="#7A6E5D" fontSize={11} tickLine={false} axisLine={false} domain={[50, 100]} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="skin" stroke="#C9A24B" strokeWidth={1.5} dot={{ fill: '#C9A24B', r: 3 }} name="Skin" />
<Line type="monotone" dataKey="body" stroke="#7A6E5D" strokeWidth={1.5} dot={{ fill: '#7A6E5D', r: 3 }} name="Body" />
</LineChart>
</ResponsiveContainer>
<div className="flex items-center gap-6 mt-6 justify-center">
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-[#C9A24B]" />
<span className="text-[11px] text-[#7A6E5D]">Skin</span>
</div>
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-[#7A6E5D]" />
<span className="text-[11px] text-[#7A6E5D]">Body</span>
</div>
</div>
</div>
</div>
);
}

