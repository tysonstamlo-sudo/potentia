'use client';

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, TrendingUp, Target, Award } from 'lucide-react';

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
{ day: 'Mon', completed: 4, total: 5 },
{ day: 'Tue', completed: 5, total: 5 },
{ day: 'Wed', completed: 3, total: 5 },
{ day: 'Thu', completed: 5, total: 5 },
{ day: 'Fri', completed: 4, total: 5 },
{ day: 'Sat', completed: 5, total: 5 },
{ day: 'Sun', completed: 4, total: 5 },
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
<div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs">
<p className="text-slate-400 mb-1">{label}</p>
{payload.map((entry: any, idx: number) => (
<p key={idx} style={{ color: entry.color }} className="font-semibold">
{entry.name}: {entry.value}
</p>
))}
</div>
);
}
return null;
}

export default function Progress() {
return (
<div className="space-y-8">
{/* Header */}
<div>
<h2 className="text-lg font-semibold tracking-tight text-white mb-1">Your Progress</h2>
<p className="text-sm text-slate-500 font-light">Track your transformation over time</p>
</div>

{/* Summary stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-5">
<div className="flex items-center gap-2 mb-2">
<Flame className="w-4 h-4 text-orange-400" />
<span className="text-xs text-slate-500 font-medium tracking-wide">STREAK</span>
</div>
<div className="text-2xl font-light text-white"><span className="font-semibold text-orange-400">7</span> days</div>
</div>
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-5">
<div className="flex items-center gap-2 mb-2">
<TrendingUp className="w-4 h-4 text-emerald-400" />
<span className="text-xs text-slate-500 font-medium tracking-wide">TOTAL XP</span>
</div>
<div className="text-2xl font-light text-white"><span className="font-semibold text-emerald-400">1,450</span></div>
</div>
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-5">
<div className="flex items-center gap-2 mb-2">
<Target className="w-4 h-4 text-teal-400" />
<span className="text-xs text-slate-500 font-medium tracking-wide">AVG COMPLETION</span>
</div>
<div className="text-2xl font-light text-white"><span className="font-semibold text-teal-400">85%</span></div>
</div>
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-5">
<div className="flex items-center gap-2 mb-2">
<Award className="w-4 h-4 text-amber-400" />
<span className="text-xs text-slate-500 font-medium tracking-wide">LEVEL</span>
</div>
<div className="text-2xl font-light text-white"><span className="font-semibold text-amber-400">5</span></div>
</div>
</div>

{/* XP Trend Chart */}
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
<h3 className="text-sm font-semibold text-white mb-6">XP Earned — Last 7 Days</h3>
<ResponsiveContainer width="100%" height={220}>
<LineChart data={xpData}>
<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
<XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="xp" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} />
</LineChart>
</ResponsiveContainer>
</div>

{/* Habit Completion Chart */}
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
<h3 className="text-sm font-semibold text-white mb-6">Daily Missions Completed</h3>
<ResponsiveContainer width="100%" height={220}>
<BarChart data={habitData}>
<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
<XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 5]} />
<Tooltip content={<CustomTooltip />} />
<Bar dataKey="completed" fill="#34d399" radius={[4, 4, 0, 0]} name="Completed" />
</BarChart>
</ResponsiveContainer>
</div>

{/* Scan Score History */}
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-xl p-6">
<h3 className="text-sm font-semibold text-white mb-6">Scan Score History</h3>
<ResponsiveContainer width="100%" height={220}>
<LineChart data={scanHistory}>
<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
<XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[50, 100]} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="skin" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} name="Skin Score" />
<Line type="monotone" dataKey="body" stroke="#2dd4bf" strokeWidth={2} dot={{ fill: '#2dd4bf', r: 4 }} name="Body Score" />
</LineChart>
</ResponsiveContainer>
<div className="flex items-center gap-6 mt-4 justify-center">
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded-full bg-emerald-400" />
<span className="text-xs text-slate-400">Skin Score</span>
</div>
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded-full bg-teal-400" />
<span className="text-xs text-slate-400">Body Score</span>
</div>
</div>
</div>
</div>
);
}

