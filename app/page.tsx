'use client';

import React, { useState } from 'react';
import { Zap, Flame, Trophy, Target, Star, CheckCircle2, ArrowRight, Droplets, Dumbbell, Sparkles } from 'lucide-react';
import FaceScan from './components/FaceScan';
import Progress from './components/Progress';
import Marketplace from './components/Marketplace';

export default function Dashboard() {
const [completedHabits, setCompletedHabits] = useState<number[]>([]);
const [activeTab, setActiveTab] = useState('dashboard');

const habits = [
{ id: 1, name: 'Morning Skincare Routine', icon: Sparkles, xp: 50, category: 'skincare' },
{ id: 2, name: '30 Minute Workout', icon: Dumbbell, xp: 100, category: 'fitness' },
{ id: 3, name: 'Hydration Goal', icon: Droplets, xp: 30, category: 'nutrition' },
{ id: 4, name: 'Protein Intake Target', icon: Star, xp: 40, category: 'nutrition' },
{ id: 5, name: 'Cold Exposure', icon: Zap, xp: 50, category: 'confidence' },
];

const achievements = [
{ name: '7 Day Streak', desc: 'Consistency is key', icon: Flame, unlocked: true },
{ name: 'Level 5', desc: 'On your way up', icon: Target, unlocked: true },
{ name: '500 XP Earned', desc: 'Coming soon', icon: Trophy, unlocked: false },
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

return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0f172a] to-slate-950 text-white p-4 md:p-8">
<div className="max-w-7xl mx-auto">
<div className="flex items-start justify-between mb-12">
<div>
<div className="inline-block mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
<span className="text-xs font-semibold text-emerald-400 tracking-wide">MEMBER</span>
</div>
<h1 className="text-5xl md:text-6xl font-light tracking-tight mb-2">
<span className="font-semibold text-white">Potentia</span>
</h1>
<p className="text-slate-500 text-sm font-light">Your transformation, guided by AI</p>
</div>
<div className="hidden lg:flex flex-col gap-3">
<div className="backdrop-blur-md bg-white/5 border border-emerald-500/20 rounded-lg px-6 py-4 text-center">
<div className="text-3xl font-light mb-1"><span className="font-semibold text-emerald-400">5</span></div>
<div className="text-xs text-slate-500 font-medium tracking-wide">LEVEL</div>
</div>
<div className="backdrop-blur-md bg-white/5 border border-emerald-500/20 rounded-lg px-6 py-4 text-center">
<div className="text-3xl font-light mb-1"><span className="font-semibold text-amber-400">{totalXP}</span></div>
<div className="text-xs text-slate-500 font-medium tracking-wide">XP TODAY</div>
</div>
</div>
</div>

<div className="flex gap-8 mb-12 border-b border-slate-800/50 pb-6">
{['dashboard', 'scan', 'progress', 'marketplace'].map(tab => (
<button
key={tab}
onClick={() => setActiveTab(tab)}
className={`pb-2 font-medium text-sm tracking-wide transition-all relative ${
activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-400'
}`}
>
{tab.charAt(0).toUpperCase() + tab.slice(1)}
{activeTab === tab && (
<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
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
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
<div className="lg:col-span-2 space-y-8">
<div className="backdrop-blur-md bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8 relative overflow-hidden">
<div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
<div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
<Zap className="w-3 h-3 text-emerald-400" />
<span className="text-xs font-semibold text-emerald-400 tracking-wide">AI INSIGHT</span>
</div>
<p className="text-slate-400 text-sm font-light mb-4">Your personalized guidance</p>
<p className="text-slate-300 text-sm leading-relaxed font-light">
Based on your profile, we recommend starting with morning skincare to prep your skin. Your workout timing looks perfect—aim for 30 minutes to maximize the effects. You&apos;re close to an 8-day streak.
</p>
<div className="mt-6 pt-6 border-t border-slate-400/10 flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-emerald-500" />
<div className="text-xs text-slate-500 font-medium">Confidence: 94%</div>
</div>
<button className="text-emerald-400 text-xs font-medium flex items-center gap-2 hover:gap-3 transition-all">
Full Plan <ArrowRight className="w-3 h-3" />
</button>
</div>
</div>

<div>
<h2 className="text-lg font-semibold tracking-tight mb-6 text-white">Today&apos;s Missions</h2>
<div className="space-y-4">
{habits.map(habit => {
const HabitIcon = habit.icon;
const done = completedHabits.includes(habit.id);
return (
<div
key={habit.id}
onClick={() => toggleHabit(habit.id)}
className={`cursor-pointer rounded-lg transition-all duration-300 ${
done
? 'border border-emerald-500/20 backdrop-blur-md bg-emerald-500/10'
: 'border border-slate-800/50 backdrop-blur-md bg-white/[0.02] hover:bg-white/[0.04] hover:border-slate-700/50'
}`}
>
<div className="p-5 flex items-center gap-4">
<div className={`p-2.5 rounded-lg ${done ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-800/30 border border-slate-700/30'}`}>
<HabitIcon className={`w-5 h-5 ${done ? 'text-emerald-400' : 'text-slate-400'}`} />
</div>
<div className="flex-1 min-w-0">
<h3 className="font-medium text-slate-200 text-sm">{habit.name}</h3>
<p className="text-xs text-slate-500 font-light capitalize mt-0.5">{habit.category}</p>
</div>
<div className="flex items-center gap-4 flex-shrink-0">
<div className="text-right">
<div className="text-sm font-semibold text-amber-400">+{habit.xp}</div>
<div className="text-xs text-slate-500 font-light">XP</div>
</div>
<div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
{done && <CheckCircle2 className="w-4 h-4 text-white" />}
</div>
</div>
</div>
</div>
);
})}
</div>
</div>

<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-lg p-6">
<h3 className="font-semibold text-sm tracking-tight mb-6 text-white">Progress Today</h3>
<div className="space-y-6">
<div>
<div className="flex justify-between items-center mb-3">
<span className="text-xs text-slate-500 font-medium tracking-wide">MISSIONS</span>
<span className="text-sm font-semibold text-emerald-400">{completedCount}/5</span>
</div>
<div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${(completedCount / 5) * 100}%` }} />
</div>
</div>
<div>
<div className="flex justify-between items-center mb-3">
<span className="text-xs text-slate-500 font-medium tracking-wide">XP EARNED</span>
<span className="text-sm font-semibold text-amber-400">{totalXP}/270</span>
</div>
<div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500" style={{ width: `${(totalXP / 270) * 100}%` }} />
</div>
</div>
</div>
</div>
</div>

<div className="space-y-6">
<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-lg p-6 space-y-6">
<div>
<p className="text-xs text-slate-500 font-medium tracking-wide mb-2">CURRENT STREAK</p>
<div className="flex items-end gap-2">
<Flame className="w-5 h-5 text-orange-400 mb-0.5" />
<span className="text-3xl font-light"><span className="font-semibold text-orange-400">7</span></span>
<span className="text-slate-500 text-sm font-light mb-1">Days</span>
</div>
</div>
<div className="border-t border-slate-700/30" />
<div>
<p className="text-xs text-slate-500 font-medium tracking-wide mb-2">WEEKLY PROGRESS</p>
<div className="flex items-baseline gap-2">
<span className="text-2xl font-light"><span className="font-semibold">28</span>/35</span>
<span className="text-slate-500 text-sm font-light">XP</span>
</div>
</div>
<div className="border-t border-slate-700/30" />
<div>
<p className="text-xs text-slate-500 font-medium tracking-wide mb-2">NEXT MILESTONE</p>
<div className="flex items-baseline gap-2">
<span className="text-2xl font-light">Level <span className="font-semibold text-emerald-400">6</span></span>
</div>
</div>
</div>

<div className="backdrop-blur-md bg-white/[0.02] border border-emerald-500/20 rounded-lg p-6">
<h3 className="font-semibold text-sm tracking-tight mb-6 text-white">Achievements</h3>
<div className="space-y-3">
{achievements.map((ach, idx) => {
const AchIcon = ach.icon;
return (
<div key={idx} className={`flex items-start gap-3 p-4 rounded-lg ${ach.unlocked ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/20 border border-slate-700/30'}`}>
<div className={`p-2 rounded-lg mt-0.5 ${ach.unlocked ? 'bg-amber-500/20' : 'bg-slate-700/30'}`}>
<AchIcon className={`w-4 h-4 ${ach.unlocked ? 'text-amber-400' : 'text-slate-500'}`} />
</div>
<div className="flex-1 min-w-0">
<p className="text-xs font-semibold text-slate-200">{ach.name}</p>
<p className="text-xs text-slate-500 font-light mt-0.5">{ach.desc}</p>
</div>
</div>
);
})}
</div>
</div>

<button
onClick={() => setActiveTab('marketplace')}
className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 text-sm tracking-wide"
>
Explore Marketplace
</button>
</div>
</div>
)}
</div>
</div>
);
}

