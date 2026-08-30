'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Flame, Trophy, Target, Star, CheckCircle2, ArrowRight, Droplets, Dumbbell, Sparkles, LogOut } from 'lucide-react';
import FaceScan from './components/FaceScan';
import Progress from './components/Progress';
import Marketplace from './components/Marketplace';

const toRoman = (num: number): string => {
const map: [number, string][] = [
[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
let result = '';
let n = num;
for (const [value, symbol] of map) {
while (n >= value) { result += symbol; n -= value; }
}
return result;
};

export default function Dashboard() {
const router = useRouter();
const [checkingAuth, setCheckingAuth] = useState(true);
const [completedHabits, setCompletedHabits] = useState<number[]>([]);
const [activeTab, setActiveTab] = useState('dashboard');

useEffect(() => {
const checkSession = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
router.push('/login');
} else {
setCheckingAuth(false);
}
};
checkSession();
}, [router]);

const handleLogout = async () => {
await supabase.auth.signOut();
router.push('/login');
};

const habits = [
{ id: 1, name: 'Morning Skincare Routine', icon: Sparkles, xp: 50, category: 'skincare' },
{ id: 2, name: '30 Minute Workout', icon: Dumbbell, xp: 100, category: 'fitness' },
{ id: 3, name: 'Hydration Goal', icon: Droplets, xp: 30, category: 'nutrition' },
{ id: 4, name: 'Protein Intake Target', icon: Star, xp: 40, category: 'nutrition' },
{ id: 5, name: 'Cold Exposure', icon: Target, xp: 50, category: 'confidence' },
];

const achievements = [
{ name: 'VII Day Streak', desc: 'Consistency is key', icon: Flame, unlocked: true },
{ name: 'Level V', desc: 'On your way up', icon: Target, unlocked: true },
{ name: 'D XP Earned', desc: 'Coming soon', icon: Trophy, unlocked: false },
];

const toggleHabit = (id: number) => {
setCompletedHabits(prev =>
prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
);
};

const completedCount = completedHabits.length;
const totalXP = completedHabits.reduce((sum, id) => {
const habit = habits.find(h => h.id === id);
return sum + (habit ? habit.xp : 0);
}, 0);

const level = 5;
const levelTarget = 270;
const ringPct = Math.min((totalXP / levelTarget) * 100, 100);
const circumference = 2 * Math.PI * 44;
const dashOffset = circumference - (ringPct / 100) * circumference;

if (checkingAuth) {
return (
<div className="min-h-screen bg-[#0A0908] flex items-center justify-center">
<div className="text-[#7A6E5D] text-sm tracking-[0.2em] uppercase font-body">Loading</div>
</div>
);
}

return (
<div className="min-h-screen bg-[#0A0908] text-[#D4AF6E]">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
.font-body { font-family: 'Inter', sans-serif; }
.relief {
background:
radial-gradient(circle at 30% 20%, rgba(184,135,79,0.06), transparent 45%),
radial-gradient(circle at 80% 80%, rgba(74,93,83,0.05), transparent 50%);
}
.seal-ring { filter: drop-shadow(0 0 14px rgba(184,135,79,0.15)); }
`}</style>

<div className="relief min-h-screen">
<div className="max-w-6xl mx-auto px-6 py-12 md:py-16">

{/* Hero — medallion front and center */}
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 mb-16 pb-10 border-b border-[#7A6E5D]/20">
<div>
<div className="flex items-center gap-2 mb-5">
<span className="font-body text-[10px] tracking-[0.35em] text-[#D4AF6E] uppercase">Potentia</span>
<span className="text-[#7A6E5D] text-[10px]">·</span>
<span className="font-body text-[10px] tracking-[0.25em] text-[#7A6E5D] uppercase">Rank {toRoman(level)}</span>
</div>
<h1 className="font-display text-5xl md:text-7xl font-light tracking-tight mb-3 text-[#D4AF6E]">
Your Ascent
</h1>
<p className="font-body text-[#7A6E5D] text-sm max-w-sm">
Guided by AI. Measured in what you actually do.
</p>
</div>

{/* Signature element: struck medallion */}
<div className="flex flex-col items-center gap-4 flex-shrink-0">
<div className="relative w-36 h-36 seal-ring">
<svg className="w-36 h-36 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" stroke="#7A6E5D" strokeOpacity="0.15" strokeWidth="1" />
<circle cx="54" cy="54" r="44" fill="#12100C" stroke="#7A6E5D" strokeOpacity="0.25" strokeWidth="1" />
<circle
cx="54" cy="54" r="44" fill="none"
stroke="#D4AF6E" strokeWidth="1.5"
strokeDasharray={circumference}
strokeDashoffset={dashOffset}
style={{ transition: 'stroke-dashoffset 0.6s ease' }}
/>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-display text-4xl text-[#D4AF6E] leading-none">{toRoman(level)}</span>
<span className="font-body text-[8px] tracking-[0.2em] text-[#7A6E5D] uppercase mt-2">Rank</span>
</div>
</div>
<button
onClick={handleLogout}
className="font-body flex items-center gap-1.5 text-[11px] text-[#7A6E5D] hover:text-[#D4AF6E] transition-colors"
>
<LogOut className="w-3 h-3" />
Log out
</button>
</div>
</div>

{/* Nav */}
<div className="flex gap-10 mb-14">
{['dashboard', 'scan', 'progress', 'marketplace'].map(tab => (
<button
key={tab}
onClick={() => setActiveTab(tab)}
className={`font-body pb-2 text-[13px] tracking-[0.05em] transition-all relative ${
activeTab === tab ? 'text-[#D4AF6E]' : 'text-[#7A6E5D] hover:text-[#B0A48F]'
}`}
>
{tab.charAt(0).toUpperCase() + tab.slice(1)}
{activeTab === tab && (
<div className="absolute -bottom-px left-0 right-0 h-px bg-[#D4AF6E]" />
)}
</button>
))}
</div>

{activeTab === 'scan' ? (
<FaceScan />
) : activeTab === 'progress' ? (
<Progress />
) : activeTab === 'marketplace' ? (
<Marketplace />
) : (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
<div className="lg:col-span-2 space-y-12">

{/* AI Insight — inscribed tablet */}
<div className="relative pl-8 border-l border-[#D4AF6E]/40">
<span className="font-body text-[10px] tracking-[0.35em] text-[#D4AF6E] uppercase block mb-4">Counsel</span>
<p className="font-display text-xl leading-relaxed text-[#D4AF6E] font-light mb-6">
Start with morning skincare to prep your skin, then hit your workout. You&apos;re close to an VIII-day streak.
</p>
<div className="flex items-center justify-between">
<span className="font-body text-[11px] text-[#7A6E5D] tracking-wide">Confidence XCIV%</span>
<button className="font-body flex items-center gap-1.5 text-[11px] text-[#D4AF6E] hover:gap-2.5 transition-all">
Full plan <ArrowRight className="w-3 h-3" />
</button>
</div>
</div>

{/* Habits — the ledger */}
<div>
<span className="font-body text-[10px] tracking-[0.35em] text-[#7A6E5D] uppercase block mb-6">Today&apos;s Ledger</span>
<div className="border-t border-[#7A6E5D]/20">
{habits.map((habit, idx) => {
const HabitIcon = habit.icon;
const done = completedHabits.includes(habit.id);
return (
<div
key={habit.id}
onClick={() => toggleHabit(habit.id)}
className="cursor-pointer border-b border-[#7A6E5D]/20 group"
>
<div className="py-5 flex items-center gap-5">
<span className={`font-display text-sm w-6 flex-shrink-0 ${done ? 'text-[#D4AF6E]' : 'text-[#7A6E5D]/50'}`}>
{toRoman(idx + 1)}
</span>
<HabitIcon className={`w-4 h-4 flex-shrink-0 transition-colors ${done ? 'text-[#D4AF6E]' : 'text-[#7A6E5D] group-hover:text-[#B0A48F]'}`} />
<div className="flex-1 min-w-0">
<h3 className={`font-body text-sm transition-colors ${done ? 'text-[#7A6E5D] line-through' : 'text-[#D4AF6E]'}`}>{habit.name}</h3>
<p className="font-body text-[11px] text-[#7A6E5D] capitalize mt-0.5">{habit.category}</p>
</div>
<span className="font-display text-sm text-[#D4AF6E]">+{habit.xp}</span>
<div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-[#D4AF6E] border-[#D4AF6E]' : 'border-[#7A6E5D]/40'}`}>
{done && <CheckCircle2 className="w-2.5 h-2.5 text-[#0A0908]" />}
</div>
</div>
</div>
);
})}
</div>
</div>

{/* Progress today */}
<div className="grid grid-cols-2 gap-8 pt-2">
<div>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Missions</span>
<span className="font-display text-[#D4AF6E]">{completedCount}<span className="text-[#7A6E5D] text-sm">/5</span></span>
</div>
<div className="h-px bg-[#7A6E5D]/20">
<div className="h-px bg-[#D4AF6E] transition-all duration-500" style={{ width: `${(completedCount / 5) * 100}%` }} />
</div>
</div>
<div>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">XP Earned</span>
<span className="font-display text-[#D4AF6E]">{totalXP}<span className="text-[#7A6E5D] text-sm">/{levelTarget}</span></span>
</div>
<div className="h-px bg-[#7A6E5D]/20">
<div className="h-px bg-[#D4AF6E] transition-all duration-500" style={{ width: `${ringPct}%` }} />
</div>
</div>
</div>
</div>

{/* Sidebar */}
<div className="space-y-10">
<div className="space-y-6">
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Current Streak</span>
<div className="flex items-baseline gap-2">
<Flame className="w-4 h-4 text-[#D4AF6E] mb-1" />
<span className="font-display text-4xl text-[#D4AF6E]">VII</span>
<span className="font-body text-xs text-[#7A6E5D]">days</span>
</div>
</div>
<div className="h-px bg-[#7A6E5D]/20" />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Weekly Progress</span>
<div className="font-display text-3xl text-[#D4AF6E]">XXVIII<span className="text-[#7A6E5D] text-base font-body"> / XXXV xp</span></div>
</div>
<div className="h-px bg-[#7A6E5D]/20" />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Next Milestone</span>
<div className="font-display text-3xl text-[#D4AF6E]">Rank <span className="text-[#D4AF6E]">VI</span></div>
</div>
</div>

<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-5">Honors</span>
<div className="space-y-4">
{achievements.map((ach, idx) => {
const AchIcon = ach.icon;
return (
<div key={idx} className="flex items-start gap-3">
<AchIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${ach.unlocked ? 'text-[#D4AF6E]' : 'text-[#7A6E5D]/40'}`} />
<div className="flex-1 min-w-0">
<p className={`font-body text-[13px] ${ach.unlocked ? 'text-[#D4AF6E]' : 'text-[#7A6E5D]/60'}`}>{ach.name}</p>
<p className="font-body text-[11px] text-[#7A6E5D] mt-0.5">{ach.desc}</p>
</div>
</div>
);
})}
</div>
</div>

<button
onClick={() => setActiveTab('marketplace')}
className="font-body w-full border border-[#D4AF6E]/40 hover:border-[#D4AF6E] hover:bg-[#D4AF6E]/[0.06] text-[#D4AF6E] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em]"
>
Enter the Marketplace
</button>
</div>
</div>
)}
</div>
</div>
</div>
);
}

