'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Flame, Trophy, Target, Star, CheckCircle2, ArrowRight, Droplets, Dumbbell, Sparkles, LogOut, Crown } from 'lucide-react';
import FaceScan from './components/FaceScan';
import Progress from './components/Progress';
import Marketplace from './components/Marketplace';
import PremiumModal from './components/PremiumModal';
import Leaderboard from './components/Leaderboard';

const XP_PER_LEVEL = 270;
const levelForXP = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => {
const d = new Date();
d.setDate(d.getDate() - 1);
return d.toISOString().slice(0, 10);
};

const habits = [
{ id: 1, name: 'Morning Skincare Routine', icon: Sparkles, xp: 50, category: 'skincare' },
{ id: 2, name: '30 Minute Workout', icon: Dumbbell, xp: 100, category: 'fitness' },
{ id: 3, name: 'Hydration Goal', icon: Droplets, xp: 30, category: 'nutrition' },
{ id: 4, name: 'Protein Intake Target', icon: Star, xp: 40, category: 'nutrition' },
{ id: 5, name: 'Cold Exposure', icon: Target, xp: 50, category: 'confidence' },
];

export default function Dashboard() {
const router = useRouter();
const [checkingAuth, setCheckingAuth] = useState(true);
const [activeTab, setActiveTab] = useState('dashboard');
const [username, setUsername] = useState('');
const [userId, setUserId] = useState<string | null>(null);

const [totalXP, setTotalXP] = useState(0);
const [level, setLevel] = useState(1);
const [streak, setStreak] = useState(0);
const [isPremium, setIsPremium] = useState(false);
const [premiumStatus, setPremiumStatus] = useState<'none' | 'pending'>('none');
const [showPremiumModal, setShowPremiumModal] = useState(false);
const [submittingPayment, setSubmittingPayment] = useState(false);
const [completedToday, setCompletedToday] = useState<Record<number, string>>({});
const [saving, setSaving] = useState(false);

useEffect(() => {
const init = async () => {
const startTime = Date.now();
const minDuration = 5000;

try {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
router.push('/login');
return;
}
setUserId(session.user.id);

const { data: profile, error: profileError } = await supabase
.from('profiles')
.select('username, total_xp, level, current_streak, is_premium, last_active_date')
.eq('id', session.user.id)
.single();

if (profileError) console.error('Profile fetch error:', profileError);

if (profile) {
if (profile.username) setUsername(profile.username);
setTotalXP(profile.total_xp ?? 0);
setLevel(profile.level ?? 1);
setIsPremium(!!profile.is_premium);

const today = todayStr();
const yesterday = yesterdayStr();
if (profile.last_active_date === today || profile.last_active_date === yesterday) {
setStreak(profile.current_streak ?? 0);
} else {
setStreak(0);
}
}

const { data: logs } = await supabase
.from('habit_logs')
.select('id, habit_name')
.eq('user_id', session.user.id)
.gte('completed_at', `${todayStr()}T00:00:00`)
.lte('completed_at', `${todayStr()}T23:59:59`);

if (logs) {
const map: Record<number, string> = {};
logs.forEach(log => {
const match = habits.find(h => h.name === log.habit_name);
if (match) map[match.id] = log.id;
});
setCompletedToday(map);
}

// Check for a pending premium request
const { data: requests } = await supabase
.from('premium_requests')
.select('status')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1);

if (requests && requests.length > 0 && requests[0].status === 'pending') {
setPremiumStatus('pending');
}
} catch (err) {
console.error('Init failed:', err);
} finally {
const elapsed = Date.now() - startTime;
setTimeout(() => setCheckingAuth(false), Math.max(minDuration - elapsed, 0));
}
};
init();
}, [router]);

const handleLogout = async () => {
await supabase.auth.signOut();
router.push('/login');
};

const toggleHabit = async (habit: typeof habits[0]) => {
if (!userId || saving) return;
setSaving(true);

const isDone = habit.id in completedToday;

try {
if (!isDone) {
const { data: inserted, error: insertError } = await supabase
.from('habit_logs')
.insert({ user_id: userId, habit_name: habit.name, xp_earned: habit.xp })
.select('id')
.single();
if (insertError) throw insertError;

const newXP = totalXP + habit.xp;
const newLevel = levelForXP(newXP);
const today = todayStr();
const yesterday = yesterdayStr();

let newStreak = streak;
const wasActiveToday = Object.keys(completedToday).length > 0;
if (!wasActiveToday) {
const { data: profile } = await supabase
.from('profiles')
.select('last_active_date')
.eq('id', userId)
.single();
if (profile?.last_active_date === yesterday) {
newStreak = streak + 1;
} else if (profile?.last_active_date !== today) {
newStreak = 1;
}
}

await supabase
.from('profiles')
.update({ total_xp: newXP, level: newLevel, current_streak: newStreak, last_active_date: today })
.eq('id', userId);

setTotalXP(newXP);
setLevel(newLevel);
setStreak(newStreak);
setCompletedToday(prev => ({ ...prev, [habit.id]: inserted.id }));
} else {
const logId = completedToday[habit.id];
await supabase.from('habit_logs').delete().eq('id', logId);

const newXP = Math.max(totalXP - habit.xp, 0);
const newLevel = levelForXP(newXP);
await supabase
.from('profiles')
.update({ total_xp: newXP, level: newLevel })
.eq('id', userId);

setTotalXP(newXP);
setLevel(newLevel);
setCompletedToday(prev => {
const next = { ...prev };
delete next[habit.id];
return next;
});
}
} catch (err) {
console.error('Toggle habit failed:', err);
} finally {
setSaving(false);
}
};

const goPremium = async () => {
setShowPremiumModal(true);
};

const submitPaymentClaim = async (plan: string) => {
if (!userId) return;
setSubmittingPayment(true);
try {
await supabase.from('premium_requests').insert({ user_id: userId, status: 'pending', plan });
setPremiumStatus('pending');
setShowPremiumModal(false);
} catch (err) {
console.error('Failed to submit payment claim:', err);
} finally {
setSubmittingPayment(false);
}
};

const completedCount = Object.keys(completedToday).length;
const xpIntoLevel = totalXP % XP_PER_LEVEL;
const ringPct = Math.min((xpIntoLevel / XP_PER_LEVEL) * 100, 100);
const circumference = 2 * Math.PI * 44;
const dashOffset = circumference - (ringPct / 100) * circumference;

const achievements = [
{ name: `${streak} Day Streak`, desc: 'Consistency is key', icon: Flame, unlocked: streak > 0 },
{ name: `Level ${level}`, desc: 'On your way up', icon: Target, unlocked: level > 1 },
{ name: '500 XP Earned', desc: totalXP >= 500 ? 'Unlocked' : 'Keep going', icon: Trophy, unlocked: totalXP >= 500 },
];

if (checkingAuth) {
return (
<div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
@keyframes glowPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
.float-seal { animation: float 3s ease-in-out infinite; }
.glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
`}</style>
<div className="relative w-20 h-20 float-seal">
<div className="absolute inset-0 rounded-full glow-pulse" style={{ boxShadow: '0 0 30px 6px rgba(201,162,75,0.35)' }} />
<svg className="w-20 h-20" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" stroke="#7A6E5D" strokeOpacity="0.3" strokeWidth="1.5" />
<circle cx="54" cy="54" r="40" fill="none" stroke="#C9A24B" strokeWidth="1.5" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="font-display text-2xl text-[#C9A24B]">P</span>
</div>
</div>
<span className="font-display text-xs tracking-[0.3em] text-[#7A6E5D] uppercase">Potentia</span>
</div>
);
}

return (
<div className="min-h-screen bg-[#050505] text-[#C9A24B]">
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
@keyframes wordReveal {
from { opacity: 0; transform: translateY(0.4em); filter: blur(4px); }
to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.word-reveal { display: inline-block; opacity: 0; animation: wordReveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
`}</style>

<div className="relief min-h-screen">
<div className="max-w-6xl mx-auto px-6 py-12 md:py-16">

<div className="flex items-center justify-between mb-14">
<div className="flex items-center gap-3">
<div className="relative w-8 h-8 flex-shrink-0">
<svg className="w-8 h-8" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" stroke="#7A6E5D" strokeOpacity="0.3" strokeWidth="2" />
<circle cx="54" cy="54" r="40" fill="none" stroke="#C9A24B" strokeWidth="2" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="font-display text-xs text-[#C9A24B]">P</span>
</div>
</div>
<span className="font-display text-lg tracking-[0.15em] text-[#C9A24B] uppercase">Potentia</span>
</div>
{isPremium && (
<div className="flex items-center gap-1.5 border border-[#C9A24B]/40 rounded-sm px-3 py-1.5 text-[10px] tracking-[0.15em] text-[#C9A24B] uppercase">
<Crown className="w-3 h-3" />
Premium
</div>
)}
</div>

<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 mb-16 pb-10 border-b border-[#7A6E5D]/20">
<div>
<div className="flex items-center gap-2 mb-5">
<span className="font-body text-[10px] tracking-[0.25em] text-[#7A6E5D] uppercase">Rank {level}</span>
</div>
<h1 className="font-display text-5xl md:text-7xl font-light tracking-tight mb-3 text-[#C9A24B]">
{(username ? `Welcome back, ${username}` : 'Your Ascent').split(' ').map((word, idx) => (
<span key={idx} className="word-reveal mr-[0.25em]" style={{ animationDelay: `${idx * 0.12}s` }}>
{word}
</span>
))}
</h1>
<p className="font-body text-[#7A6E5D] text-sm max-w-sm">
Guided by AI. Measured in what you actually do.
</p>
</div>

<div className="flex flex-col items-center gap-4 flex-shrink-0">
<div className="relative w-36 h-36 seal-ring">
<svg className="w-36 h-36 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" stroke="#7A6E5D" strokeOpacity="0.15" strokeWidth="1" />
<circle cx="54" cy="54" r="44" fill="#0D0D0D" stroke="#7A6E5D" strokeOpacity="0.25" strokeWidth="1" />
<circle
cx="54" cy="54" r="44" fill="none"
stroke="#C9A24B" strokeWidth="1.5"
strokeDasharray={circumference}
strokeDashoffset={dashOffset}
style={{ transition: 'stroke-dashoffset 0.6s ease' }}
/>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-display text-4xl text-[#C9A24B] leading-none">{level}</span>
<span className="font-body text-[8px] tracking-[0.2em] text-[#7A6E5D] uppercase mt-2">Rank</span>
</div>
</div>
<button onClick={handleLogout} className="font-body flex items-center gap-1.5 text-[11px] text-[#7A6E5D] hover:text-[#C9A24B] transition-colors">
<LogOut className="w-3 h-3" />
Log out
</button>
</div>
</div>

<div className="flex gap-10 mb-14">
{['dashboard', 'scan', 'progress', 'rankings', 'marketplace'].map(tab => (
<button
key={tab}
onClick={() => setActiveTab(tab)}
className={`font-body pb-2 text-[13px] tracking-[0.05em] transition-all relative ${
activeTab === tab ? 'text-[#C9A24B]' : 'text-[#7A6E5D] hover:text-[#B0A48F]'
}`}
>
{tab.charAt(0).toUpperCase() + tab.slice(1)}
{activeTab === tab && <div className="absolute -bottom-px left-0 right-0 h-px bg-[#C9A24B]" />}
</button>
))}
</div>

{activeTab === 'scan' ? (
<FaceScan isPremium={isPremium} onGoPremium={goPremium} />
) : activeTab === 'progress' ? (
<Progress totalXP={totalXP} level={level} streak={streak} />
) : activeTab === 'rankings' ? (
<Leaderboard />
) : activeTab === 'marketplace' ? (
<Marketplace />
) : (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
<div className="lg:col-span-2 space-y-12">

<div className="relative pl-8 border-l border-[#C9A24B]/40">
<span className="font-body text-[10px] tracking-[0.35em] text-[#C9A24B] uppercase block mb-4">Counsel</span>
<p className="font-display text-xl leading-relaxed text-[#C9A24B] font-light mb-6">
Start with morning skincare to prep your skin, then hit your workout. Stay consistent to keep your streak alive.
</p>
<div className="flex items-center justify-between">
<span className="font-body text-[11px] text-[#7A6E5D] tracking-wide">Confidence 94%</span>
<button className="font-body flex items-center gap-1.5 text-[11px] text-[#C9A24B] hover:gap-2.5 transition-all">
Full plan <ArrowRight className="w-3 h-3" />
</button>
</div>
</div>

<div>
<span className="font-body text-[10px] tracking-[0.35em] text-[#7A6E5D] uppercase block mb-6">Today&apos;s Ledger</span>
<div className="border-t border-[#7A6E5D]/20">
{habits.map((habit, idx) => {
const HabitIcon = habit.icon;
const done = habit.id in completedToday;
return (
<div
key={habit.id}
onClick={() => toggleHabit(habit)}
className={`cursor-pointer border-b border-[#7A6E5D]/20 group ${saving ? 'pointer-events-none opacity-60' : ''}`}
>
<div className="py-5 flex items-center gap-5">
<span className={`font-display text-sm w-6 flex-shrink-0 ${done ? 'text-[#C9A24B]' : 'text-[#7A6E5D]/50'}`}>
{idx + 1}
</span>
<HabitIcon className={`w-4 h-4 flex-shrink-0 transition-colors ${done ? 'text-[#C9A24B]' : 'text-[#7A6E5D] group-hover:text-[#B0A48F]'}`} />
<div className="flex-1 min-w-0">
<h3 className={`font-body text-sm transition-colors ${done ? 'text-[#7A6E5D] line-through' : 'text-[#C9A24B]'}`}>{habit.name}</h3>
<p className="font-body text-[11px] text-[#7A6E5D] capitalize mt-0.5">{habit.category}</p>
</div>
<span className="font-display text-sm text-[#C9A24B]">+{habit.xp}</span>
<div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-[#C9A24B] border-[#C9A24B]' : 'border-[#7A6E5D]/40'}`}>
{done && <CheckCircle2 className="w-2.5 h-2.5 text-[#050505]" />}
</div>
</div>
</div>
);
})}
</div>
</div>

<div className="grid grid-cols-2 gap-8 pt-2">
<div>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">Missions</span>
<span className="font-display text-[#C9A24B]">{completedCount}<span className="text-[#7A6E5D] text-sm">/5</span></span>
</div>
<div className="h-px bg-[#7A6E5D]/20">
<div className="h-px bg-[#C9A24B] transition-all duration-500" style={{ width: `${(completedCount / 5) * 100}%` }} />
</div>
</div>
<div>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase">XP to Next Rank</span>
<span className="font-display text-[#C9A24B]">{xpIntoLevel}<span className="text-[#7A6E5D] text-sm">/{XP_PER_LEVEL}</span></span>
</div>
<div className="h-px bg-[#7A6E5D]/20">
<div className="h-px bg-[#C9A24B] transition-all duration-500" style={{ width: `${ringPct}%` }} />
</div>
</div>
</div>
</div>

<div className="space-y-10">
<div className="space-y-6">
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Current Streak</span>
<div className="flex items-baseline gap-2">
<Flame className="w-4 h-4 text-[#C9A24B] mb-1" />
<span className="font-display text-4xl text-[#C9A24B]">{streak}</span>
<span className="font-body text-xs text-[#7A6E5D]">days</span>
</div>
</div>
<div className="h-px bg-[#7A6E5D]/20" />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Total XP</span>
<div className="font-display text-3xl text-[#C9A24B]">{totalXP}</div>
</div>
<div className="h-px bg-[#7A6E5D]/20" />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-2">Next Milestone</span>
<div className="font-display text-3xl text-[#C9A24B]">Rank <span>{level + 1}</span></div>
</div>
</div>

<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[#7A6E5D] uppercase block mb-5">Honors</span>
<div className="space-y-4">
{achievements.map((ach, idx) => {
const AchIcon = ach.icon;
return (
<div key={idx} className="flex items-start gap-3">
<AchIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${ach.unlocked ? 'text-[#C9A24B]' : 'text-[#7A6E5D]/40'}`} />
<div className="flex-1 min-w-0">
<p className={`font-body text-[13px] ${ach.unlocked ? 'text-[#C9A24B]' : 'text-[#7A6E5D]/60'}`}>{ach.name}</p>
<p className="font-body text-[11px] text-[#7A6E5D] mt-0.5">{ach.desc}</p>
</div>
</div>
);
})}
</div>
</div>

{isPremium ? (
<button
onClick={() => setActiveTab('marketplace')}
className="font-body w-full border border-[#C9A24B]/40 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.06] text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em]"
>
Enter the Marketplace
</button>
) : premiumStatus === 'pending' ? (
<div className="w-full border border-[#7A6E5D]/30 text-[#7A6E5D] font-medium py-3.5 rounded-sm text-[13px] tracking-[0.05em] text-center">
Payment Pending Review
</div>
) : (
<button
onClick={goPremium}
className="font-body w-full flex items-center justify-center gap-2 border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] text-[#C9A24B] font-medium py-3.5 rounded-sm transition-all text-[13px] tracking-[0.05em]"
>
<Crown className="w-4 h-4" />
Go Premium
</button>
)}
</div>
</div>
)}
</div>
</div>

{showPremiumModal && (
<PremiumModal
onClose={() => setShowPremiumModal(false)}
onConfirm={submitPaymentClaim}
submitting={submittingPayment}
/>
)}
</div>
);
}

