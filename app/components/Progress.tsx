'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
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


const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

/* Recharts needs real colour values (CSS vars don't resolve in SVG attributes
reliably), so read the live theme tokens and re-read when the theme flips. */
function useThemeColors() {
const [c, setC] = useState({ accent: 'rgb(79,216,255)', muted: 'rgb(107,118,128)', surface: 'rgb(15,17,19)' });
useEffect(() => {
const read = () => {
const s = getComputedStyle(document.documentElement);
const ch = (n: string) => s.getPropertyValue(n).trim().split(/\s+/).join(',');
setC({
accent: `rgb(${ch('--gold')})`,
muted: `rgb(${ch('--muted')})`,
surface: `rgb(${ch('--surface')})`,
});
};
read();
const obs = new MutationObserver(read);
obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
return () => obs.disconnect();
}, []);
return c;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
if (active && payload && payload.length) {
return (
<div
className="rounded-xl px-3 py-2 text-xs font-body backdrop-blur-md"
style={{ background: 'rgb(var(--surface) / 0.92)', border: '1px solid rgb(var(--gold) / 0.3)' }}
>
<p className="text-[rgb(var(--muted))] mb-1">{label}</p>
{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
{payload.map((entry: any, idx: number) => (
<p key={idx} className="text-[rgb(var(--gold))] font-medium">
{entry.name}: {entry.value}
</p>
))}
</div>
);
}
return null;
}

function ChartCard({ title, sample = true, children }: { title: string; sample?: boolean; children: React.ReactNode }) {
return (
<div className="rounded-2xl p-5" style={cardStyle}>
<div className="flex items-center justify-between mb-5">
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{title}</span>
{sample && <span className="text-[9px] text-[rgb(var(--muted))] opacity-70 italic">sample trend</span>}
</div>
{children}
</div>
);
}

export default function Progress({ totalXP, level, streak }: ProgressProps) {
const XP_PER_LEVEL = 270;
const { accent, muted } = useThemeColors();
const [scans, setScans] = useState<{ date: string; overall: number; potential: number }[]>([]);

useEffect(() => {
const load = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
const { data } = await supabase
.from('scans')
.select('created_at, overall, potential')
.eq('user_id', session.user.id)
.order('created_at', { ascending: true })
.limit(30);
if (data) {
setScans(
data.map(r => ({
date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
overall: Number(r.overall),
potential: Number(r.potential),
}))
);
}
};
load();
}, []);

const firstScan = scans[0];
const lastScan = scans[scans.length - 1];
const delta = firstScan && lastScan ? Math.round((lastScan.overall - firstScan.overall) * 10) / 10 : 0;
const grid = <CartesianGrid strokeDasharray="1 6" stroke={muted} strokeOpacity={0.3} vertical={false} />;

const stats = [
{ icon: Flame, label: 'Streak', value: streak, suffix: '' },
{ icon: TrendingUp, label: 'Total XP', value: totalXP, suffix: '' },
{ icon: Target, label: 'To next rank', value: totalXP % XP_PER_LEVEL, suffix: `/${XP_PER_LEVEL}` },
{ icon: Award, label: 'Rank', value: level, suffix: '' },
];

return (
<div className="space-y-5 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">Record</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">Your Progress</h2>
</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{stats.map(({ icon: Icon, label, value, suffix }) => (
<div key={label} className="rounded-2xl p-4" style={cardStyle}>
<div className="flex items-center gap-2 mb-3">
<Icon className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.15em] text-[rgb(var(--muted))] uppercase">{label}</span>
</div>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))]">
{value}
{suffix && <span className="text-sm font-normal text-[rgb(var(--muted))]">{suffix}</span>}
</div>
</div>
))}
</div>

<ChartCard title="XP — Last 7 Days">
<ResponsiveContainer width="100%" height={210}>
<LineChart data={xpData}>
{grid}
<XAxis dataKey="day" stroke={muted} fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke={muted} fontSize={11} tickLine={false} axisLine={false} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="xp" name="XP" stroke={accent} strokeWidth={2} dot={{ fill: accent, r: 3 }} />
</LineChart>
</ResponsiveContainer>
</ChartCard>

<ChartCard title="Missions Completed">
<ResponsiveContainer width="100%" height={210}>
<BarChart data={habitData}>
{grid}
<XAxis dataKey="day" stroke={muted} fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke={muted} fontSize={11} tickLine={false} axisLine={false} domain={[0, 5]} />
<Tooltip content={<CustomTooltip />} cursor={{ fill: muted, fillOpacity: 0.1 }} />
<Bar dataKey="completed" fill={accent} radius={[6, 6, 0, 0]} name="Completed" />
</BarChart>
</ResponsiveContainer>
</ChartCard>

<ChartCard title="Reading History" sample={false}>
{scans.length === 0 ? (
<p className="text-sm text-[rgb(var(--muted))] text-center py-10">
No scans yet. Run a facial scan and your trend shows up here.
</p>
) : (
<>
<div className="flex items-baseline gap-3 mb-4">
<span className="font-display text-3xl font-bold text-[rgb(var(--gold))]">{lastScan.overall.toFixed(1)}</span>
<span className="text-xs text-[rgb(var(--muted))]">latest overall</span>
{scans.length > 1 && (
<span
className="text-xs font-medium"
style={{ color: delta >= 0 ? 'rgb(var(--gold))' : 'rgb(var(--err))' }}
>
{delta >= 0 ? '+' : ''}{delta} since first scan
</span>
)}
</div>
<ResponsiveContainer width="100%" height={210}>
<LineChart data={scans}>
{grid}
<XAxis dataKey="date" stroke={muted} fontSize={11} tickLine={false} axisLine={false} />
<YAxis stroke={muted} fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} />
<Tooltip content={<CustomTooltip />} />
<Line type="monotone" dataKey="overall" stroke={accent} strokeWidth={2} dot={{ fill: accent, r: 3 }} name="Overall" />
<Line type="monotone" dataKey="potential" stroke={muted} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Potential" />
</LineChart>
</ResponsiveContainer>
<div className="flex items-center gap-6 mt-4 justify-center">
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-[rgb(var(--gold))]" />
<span className="text-[11px] text-[rgb(var(--muted))]">Overall</span>
</div>
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-[rgb(var(--muted))]" />
<span className="text-[11px] text-[rgb(var(--muted))]">Potential (est.)</span>
</div>
</div>
</>
)}
</ChartCard>
</div>
);
}

