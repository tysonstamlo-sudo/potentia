'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { ThemeStyles, ThemeToggle, MarbleBackground, MarbleImage } from '../lib/theme';
import { Flame, Trophy, Target, Star, CheckCircle2, ArrowRight, Droplets, Dumbbell, Sparkles, LogOut, Crown } from 'lucide-react';
import FaceScan from './components/FaceScan';
import Progress from './components/Progress';
import Marketplace from './components/Marketplace';
import PremiumModal from './components/PremiumModal';
import Leaderboard from './components/Leaderboard';
import Friends from './components/Friends';
import BottomNav, { TabKey } from './components/BottomNav';
import FullPlanModal from './components/FullPlan';
import Onboarding, { CONCERN_FOCUS, type OnboardingAnswers } from './components/Onboarding';
import { useLang, LanguageToggle, LanguageStyles } from '../lib/i18n';
import { faceTier } from '../lib/faceAnalysis';
import { tasksForLevel, daysRequired, needsScan, rankTitle, AREA_LABEL, MAX_LEVEL, type ProgramTask } from '../lib/program';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => {
const d = new Date();
d.setDate(d.getDate() - 1);
return d.toISOString().slice(0, 10);
};

const AREA_ICON = {
skin: Sparkles,
body: Dumbbell,
nutrition: Droplets,
face: Star,
recovery: Target,
} as const;

type LevelStatus = {
level: number;
days_done: number;
days_required: number;
scan_needed: boolean;
scan_ok: boolean;
maxed: boolean;
ready: boolean;
};

// Shared glass-card look used throughout the Biometric Lab theme
const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.55)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

const accentCardStyle: React.CSSProperties = {
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.3))',
border: '1px solid rgb(var(--gold) / 0.2)',
backdropFilter: 'blur(10px)',
};

export default function Dashboard() {
const { t } = useLang();
const router = useRouter();
const [checkingAuth, setCheckingAuth] = useState(true);
const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
const [username, setUsername] = useState('');
const [userId, setUserId] = useState<string | null>(null);

const [totalXP, setTotalXP] = useState(0);
const [level, setLevel] = useState(1);
const [streak, setStreak] = useState(0);
const [isPremium, setIsPremium] = useState(false);
const [premiumExpired, setPremiumExpired] = useState(false);
const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
const [premiumStatus, setPremiumStatus] = useState<'none' | 'pending'>('none');
const [showPremiumModal, setShowPremiumModal] = useState(false);
const [showPlan, setShowPlan] = useState(false);
const [showOnboarding, setShowOnboarding] = useState(false);
const [tierLabel, setTierLabel] = useState<string | null>(null);
const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
const [submittingPayment, setSubmittingPayment] = useState(false);
const [completedToday, setCompletedToday] = useState<Record<number, string>>({});
const [levelStatus, setLevelStatus] = useState<LevelStatus | null>(null);
const [rankingUp, setRankingUp] = useState(false);
const [rankMsg, setRankMsg] = useState('');
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
.select('username, total_xp, level, current_streak, is_premium, subscription_expires_at, last_active_date')
.eq('id', session.user.id)
.single();

if (profileError) console.error('Profile fetch error:', profileError);

if (profile) {
if (profile.username) setUsername(profile.username);
setTotalXP(profile.total_xp ?? 0);
setLevel(profile.level ?? 1);
// Premium only counts while the paid period has not run out
const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
const expired = !!profile.is_premium && !!expiresAt && expiresAt.getTime() <= Date.now();
setIsPremium(!!profile.is_premium && !expired);
setPremiumExpired(expired);
setPremiumUntil(expiresAt && !expired ? expiresAt.toISOString() : null);
if (expired) {
// Switch the flag off in the database too (best effort)
await supabase.from('profiles').update({ is_premium: false }).eq('id', session.user.id);
}

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
const match = tasksForLevel(profile?.level ?? 1).find(h => h.name === log.habit_name);
if (match) map[match.id] = log.id;
});
setCompletedToday(map);
}

await loadLevelStatus();

// First-run quiz (separate query so the dashboard still loads if the column is missing)
const { data: ob, error: obError } = await supabase
.from('profiles')
.select('onboarding, onboarded_at')
.eq('id', session.user.id)
.single();
if (!obError && ob) {
if (ob.onboarding) setOnboarding(ob.onboarding as OnboardingAnswers);
if (!ob.onboarded_at) setShowOnboarding(true);
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

// Your face tier (from your latest scan) is part of your rank. Only you see it.
const loadTier = async (uid: string) => {
const [{ data: prof }, { data: last }] = await Promise.all([
supabase.from('profiles').select('gender').eq('id', uid).single(),
supabase.from('scans').select('overall, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(3),
]);
if (last && last[0]) {
const g = prof?.gender === 'female' ? 'female' : 'male';
// same steady score as the scan screen: latest scan averaged with recent ones (3 weeks)
const recent = last.filter(
(s: { created_at: string }, i: number) => i === 0 || Date.now() - new Date(s.created_at).getTime() < 21 * 24 * 3600 * 1000,
);
const avg = recent.reduce((a: number, s: { overall: number }) => a + Number(s.overall), 0) / recent.length;
setTierLabel(faceTier(Math.round(avg * 10) / 10, g).label);
}
};

useEffect(() => {
if (userId && activeTab === 'dashboard') loadTier(userId);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId, activeTab]);

const loadLevelStatus = async () => {
const { data, error } = await supabase.rpc('level_status');
if (error) {
console.error('level_status failed:', error);
return;
}
if (data && !data.error) {
setLevelStatus(data as LevelStatus);
setLevel(data.level);
}
};

const rankUp = async () => {
if (rankingUp) return;
setRankingUp(true);
setRankMsg('');
const { data, error } = await supabase.rpc('rank_up');
setRankingUp(false);
if (error || !data?.ok) {
setRankMsg(t(data?.reason ?? 'Could not rank up. Try again.'));
return;
}
setLevel(data.level);
setCompletedToday({}); // new level, new tasks
setRankMsg(t('Level {n} unlocked.', { n: data.level }));
await loadLevelStatus();
};

const toggleHabit = async (habit: ProgramTask) => {
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
.update({ total_xp: newXP, current_streak: newStreak, last_active_date: today })
.eq('id', userId);

setTotalXP(newXP);
setStreak(newStreak);
setCompletedToday(prev => ({ ...prev, [habit.id]: inserted.id }));
} else {
const logId = completedToday[habit.id];
await supabase.from('habit_logs').delete().eq('id', logId);

const newXP = Math.max(totalXP - habit.xp, 0);
await supabase
.from('profiles')
.update({ total_xp: newXP })
.eq('id', userId);

setTotalXP(newXP);
setCompletedToday(prev => {
const next = { ...prev };
delete next[habit.id];
return next;
});
}
await loadLevelStatus();
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
const tasks = tasksForLevel(level);
const daysDone = levelStatus?.days_done ?? 0;
const daysReq = levelStatus?.days_required ?? daysRequired(level);
const ringPct = Math.min((daysDone / daysReq) * 100, 100);
const circumference = 2 * Math.PI * 44;
const dashOffset = circumference - (ringPct / 100) * circumference;

const achievements = [
{ name: t('{n} Day Streak', { n: streak }), desc: t('Consistency is key'), icon: Flame, unlocked: streak > 0 },
{ name: t('Level {n}', { n: level }), desc: t('On your way up'), icon: Target, unlocked: level > 1 },
{ name: t('500 XP Earned'), desc: totalXP >= 500 ? t('Unlocked') : t('Keep going'), icon: Trophy, unlocked: totalXP >= 500 },
];

if (checkingAuth) {
return (
<div className="min-h-screen bg-[rgb(var(--bg))] flex flex-col items-center justify-center gap-6 relative overflow-hidden transition-colors">
<ThemeStyles />
<MarbleBackground />
<MarbleImage />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
@keyframes glowPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
.float-seal { animation: float 3s ease-in-out infinite; }
.glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
`}</style>
<div className="relative w-20 h-20 float-seal z-10">
<div
className="absolute inset-0 rounded-full glow-pulse"
style={{ boxShadow: '0 0 30px 6px rgb(var(--glow) / 0.35)' }}
/>
<svg className="w-20 h-20" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="52" fill="none" style={{ stroke: 'rgb(var(--muted) / 0.3)' }} strokeWidth="1.5" />
<circle cx="54" cy="54" r="40" fill="none" style={{ stroke: 'rgb(var(--gold))' }} strokeWidth="1.5" />
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="font-display text-2xl font-bold text-[rgb(var(--gold))]">P</span>
</div>
</div>
<span className="font-display text-xs tracking-[0.3em] text-[rgb(var(--muted))] uppercase z-10">{t("Potentia")}</span>
</div>
);
}

return (
<div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--gold))] overflow-x-hidden relative transition-colors">
<ThemeStyles />
<MarbleBackground />
<MarbleImage />
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-body { font-family: 'Inter', sans-serif; }
* { -webkit-text-size-adjust: 100%; }
.seal-ring { filter: drop-shadow(0 0 14px rgb(var(--glow) / 0.25)); }
@keyframes wordReveal {
from { opacity: 0; transform: translateY(0.4em); filter: blur(4px); }
to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.word-reveal { display: inline-block; opacity: 0; animation: wordReveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
`}</style>

<LanguageStyles />
<ThemeToggle className="fixed top-4 right-4 z-40" />
<LanguageToggle className="fixed top-4 right-16 z-40" />

<div className="relative z-10">
<div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 w-full pb-28 md:pb-16">

<div className="flex items-center justify-between mb-14">
<div className="flex items-center gap-3">
<div
className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
style={{ background: 'linear-gradient(145deg, rgb(var(--gold)), rgb(var(--bg)))' }}
>
<span className="font-display text-xs font-bold" style={{ color: 'rgb(var(--bg))' }}>P</span>
</div>
<span className="font-display text-lg tracking-[0.1em] text-[rgb(var(--gold))] uppercase">{t("Potentia")}</span>
</div>
{isPremium && (
<div
className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.15em] text-[rgb(var(--gold))] uppercase"
style={{ background: 'rgb(var(--gold) / 0.12)', border: '1px solid rgb(var(--gold) / 0.3)' }}
>
<Crown className="w-3 h-3" />
{t("Premium")}
{premiumUntil && (() => {
const d = Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / 86400000);
return <span className="opacity-70 normal-case tracking-normal">· {t('{n}d left', { n: d })}</span>;
})()}
</div>
)}
</div>

<div
className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 mb-10 p-6 sm:p-8 rounded-2xl w-full"
style={cardStyle}
>
<div className="min-w-0">
<div className="flex items-center gap-2 mb-5">
<span
className="w-1.5 h-1.5 rounded-full"
style={{ background: 'rgb(var(--gold))', boxShadow: '0 0 8px rgb(var(--gold))' }}
/>
<span className="font-body text-[10px] tracking-[0.25em] text-[rgb(var(--muted))] uppercase">{t("Readout \u00b7 Today")}</span>
</div>
<h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-3 text-[rgb(var(--gold))] break-words">
{(username ? t('Welcome back, {name}', { name: username }) : t('Your Ascent')).split(' ').map((word, idx) => (
<span key={idx} className="word-reveal mr-[0.25em]" style={{ animationDelay: `${idx * 0.12}s` }}>
{word}
</span>
))}
</h1>
<p className="font-body text-[rgb(var(--muted))] text-sm max-w-sm">
{t("Guided by AI. Measured in what you actually do.")}
</p>
</div>

<div className="flex flex-col items-center gap-4 flex-shrink-0">
<div className="relative w-32 h-32 seal-ring">
<svg className="w-32 h-32 -rotate-90" viewBox="0 0 108 108">
<circle cx="54" cy="54" r="44" fill="none" style={{ stroke: 'rgb(var(--muted) / 0.15)' }} strokeWidth="7" />
<circle
cx="54" cy="54" r="44" fill="none"
style={{ stroke: 'rgb(var(--gold))' }} strokeWidth="7"
strokeDasharray={circumference}
strokeDashoffset={dashOffset}
strokeLinecap="round"
/>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-display text-4xl font-bold text-[rgb(var(--gold))] leading-none">{level}</span>
<span className="font-body text-[8px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase mt-2">{t("Level")}</span>
</div>
</div>
<button
onClick={() => setActiveTab('scan')}
className="font-display text-xs font-semibold rounded-full px-3 py-1"
style={{ background: 'rgb(var(--gold) / 0.14)', color: 'rgb(var(--gold))', border: '1px solid rgb(var(--gold) / 0.35)' }}
>
{tierLabel ?? t('Scan to get your tier')}
</button>
<button
onClick={handleLogout}
className="font-body flex items-center gap-1.5 text-[11px] text-[rgb(var(--muted))] hover:text-[rgb(var(--gold))] transition-colors"
>
<LogOut className="w-3 h-3" />
{t("Log out")}
</button>
</div>
</div>

{/* Top tabs stay for desktop; BottomNav takes over on phone (rendered below, fixed) */}
<div className="hidden md:flex gap-2 mb-10 p-1.5 rounded-xl" style={cardStyle}>
{['dashboard', 'scan', 'progress', 'rankings', 'friends', 'marketplace'].map(tab => (
<button
key={tab}
onClick={() => setActiveTab(tab as TabKey)}
className="font-body px-4 py-2 text-[13px] tracking-[0.03em] transition-all rounded-lg"
style={{
color: activeTab === tab ? 'rgb(var(--bg))' : 'rgb(var(--muted))',
background: activeTab === tab ? 'rgb(var(--gold))' : 'transparent',
}}
>
{tab.charAt(0).toUpperCase() + tab.slice(1)}
</button>
))}
</div>

{activeTab === 'scan' ? (
<FaceScan isPremium={isPremium} onGoPremium={goPremium} />
) : activeTab === 'progress' ? (
<Progress totalXP={totalXP} level={level} streak={streak} tierLabel={tierLabel} />
) : activeTab === 'rankings' ? (
<Leaderboard />
) : activeTab === 'friends' ? (
<Friends myStats={{ totalXP, level, streak }} />
) : activeTab === 'marketplace' ? (
<Marketplace />
) : (
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 space-y-6">

<div className="relative p-6 rounded-2xl" style={accentCardStyle}>
<span className="font-body text-[10px] tracking-[0.3em] text-[rgb(var(--gold))] uppercase block mb-4">{t("Counsel")}</span>
<p className="font-display text-xl leading-relaxed text-[rgb(var(--gold))] font-medium mb-6">
{onboarding?.concern && CONCERN_FOCUS[onboarding.concern]
? t(CONCERN_FOCUS[onboarding.concern])
: t("Start with morning skincare to prep your skin, then hit your workout. Stay consistent to keep your streak alive.")}
</p>
<div className="flex items-center justify-between">
<span className="font-body text-[11px] text-[rgb(var(--muted))] tracking-wide">{t("Built from your latest scan")}</span>
<button
onClick={() => setShowPlan(true)}
className="font-body flex items-center gap-1.5 text-[11px] text-[rgb(var(--gold))] hover:gap-2.5 transition-all"
>
{t("Full plan")} <ArrowRight className="w-3 h-3" />
</button>
</div>
</div>

{levelStatus && !levelStatus.maxed && (
<div className="p-5 rounded-2xl" style={levelStatus.ready ? accentCardStyle : cardStyle}>
<div className="flex items-center justify-between gap-4">
<div className="min-w-0">
<span className="font-body text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1">{t('Next Rank · Level {n}', { n: level + 1 })}</span>
<p className="font-body text-[12px] text-[rgb(var(--muted-hover))] leading-relaxed">
{levelStatus.ready
? t('You earned it. Rank up to unlock new tasks.')
: daysDone < daysReq
? t('Complete {n} more days at this level.', { n: daysReq - daysDone })
: t('Scan your face to unlock this level. Your score must not drop.')}
{needsScan(level) && !levelStatus.ready && daysDone < daysReq ? ' ' + t('A face scan is also required.') : ''}
</p>
{rankMsg && <p className="font-body text-[11px] text-[rgb(var(--gold))] mt-1">{rankMsg}</p>}
</div>
{levelStatus.ready ? (
<button
onClick={rankUp}
disabled={rankingUp}
className="font-body flex-shrink-0 font-medium py-2.5 px-4 rounded-xl text-xs disabled:opacity-50"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{rankingUp ? t('Ranking up…') : t('Rank up')}
</button>
) : daysDone >= daysReq && levelStatus.scan_needed ? (
<button
onClick={() => setActiveTab('scan')}
className="font-body flex-shrink-0 font-medium py-2.5 px-4 rounded-xl text-xs"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t("Scan now")}
</button>
) : null}
</div>
</div>
)}
{levelStatus?.maxed && (
<div className="p-5 rounded-2xl" style={accentCardStyle}>
<span className="font-display text-[rgb(var(--gold))]">{t('Level {n} · Apex. You finished the program.', { n: MAX_LEVEL })}</span>
</div>
)}

<div className="p-6 rounded-2xl" style={cardStyle}>
<div className="flex items-center justify-between mb-5">
<div>
<span className="font-body text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block">{t("Today's Protocol")}</span>
<span className="font-body text-[11px] text-[rgb(var(--gold))]">{t('Level {n}', { n: level })} · {tierLabel ?? t(rankTitle(level))}</span>
</div>
<span className="font-display text-sm text-[rgb(var(--gold))]">{completedCount}/{tasks.length}</span>
</div>
<div className="space-y-2">
{tasks.map(habit => {
const HabitIcon = AREA_ICON[habit.area];
const done = habit.id in completedToday;
return (
<div
key={habit.id}
onClick={() => toggleHabit(habit)}
className={`cursor-pointer rounded-xl transition-all ${saving ? 'pointer-events-none opacity-60' : ''}`}
style={{
background: done ? 'rgb(var(--gold) / 0.05)' : 'rgb(var(--muted) / 0.04)',
border: `1px solid ${done ? 'rgb(var(--gold) / 0.15)' : 'rgb(var(--muted) / 0.1)'}`,
}}
>
<div className="py-3.5 px-4 flex items-center gap-4">
<div
className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
style={{ background: done ? 'rgb(var(--gold) / 0.14)' : 'rgb(var(--muted) / 0.1)' }}
>
<HabitIcon
className="w-4 h-4 transition-colors"
style={{ color: done ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }}
/>
</div>
<div className="flex-1 min-w-0">
<h3
className={`font-body text-sm font-medium transition-colors ${done ? 'line-through' : ''}`}
style={{ color: done ? 'rgb(var(--muted))' : 'rgb(var(--gold))' }}
>
{t(habit.name)}
</h3>
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-0.5">{t(AREA_LABEL[habit.area])} · {t(habit.hint)}</p>
</div>
<span className="font-display text-sm text-[rgb(var(--gold))]">+{habit.xp}</span>
<div
className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
style={{
background: done ? 'rgb(var(--gold))' : 'transparent',
border: done ? '1px solid rgb(var(--gold))' : '1px solid rgb(var(--muted) / 0.35)',
}}
>
{done && <CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--bg))' }} />}
</div>
</div>
</div>
);
})}
</div>
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-4 leading-relaxed">
{t("A day counts when you finish at least 3 of these. Be honest. Your scans will show if it is working.")}
</p>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="p-5 rounded-2xl" style={cardStyle}>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Missions")}</span>
<span className="font-display text-[rgb(var(--gold))]">{completedCount}<span className="text-[rgb(var(--muted))] text-sm">/{tasks.length}</span></span>
</div>
<div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full transition-all duration-500" style={{ width: `${(completedCount / tasks.length) * 100}%`, background: 'rgb(var(--gold))' }} />
</div>
</div>
<div className="p-5 rounded-2xl" style={cardStyle}>
<div className="flex justify-between items-baseline mb-3">
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{t("Days at Level")}</span>
<span className="font-display text-[rgb(var(--gold))]">{daysDone}<span className="text-[rgb(var(--muted))] text-sm">/{daysReq}</span></span>
</div>
<div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--muted) / 0.15)' }}>
<div className="h-full rounded-full transition-all duration-500" style={{ width: `${ringPct}%`, background: 'rgb(var(--gold))' }} />
</div>
</div>
</div>
</div>

<div className="space-y-4">
<div className="p-6 rounded-2xl space-y-5" style={cardStyle}>
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{t("Current Streak")}</span>
<div className="flex items-baseline gap-2">
<Flame className="w-4 h-4 text-[rgb(var(--gold))] mb-1" />
<span className="font-display text-4xl font-bold text-[rgb(var(--gold))]">{streak}</span>
<span className="font-body text-xs text-[rgb(var(--muted))]">{t("days")}</span>
</div>
</div>
<div className="h-px" style={{ background: 'rgb(var(--muted) / 0.15)' }} />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{t("Total XP")}</span>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))]">{totalXP}</div>
</div>
<div className="h-px" style={{ background: 'rgb(var(--muted) / 0.15)' }} />
<div>
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-2">{t("Next Milestone")}</span>
<div className="font-display text-3xl font-bold text-[rgb(var(--gold))]">{t("Level")} <span>{level + 1}</span></div>
</div>
</div>

<div className="p-6 rounded-2xl" style={cardStyle}>
<span className="font-body text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase block mb-5">{t("Honors")}</span>
<div className="space-y-4">
{achievements.map((ach, idx) => {
const AchIcon = ach.icon;
return (
<div key={idx} className="flex items-start gap-3">
<AchIcon
className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
style={{ color: ach.unlocked ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.4)' }}
/>
<div className="flex-1 min-w-0">
<p className="font-body text-[13px]" style={{ color: ach.unlocked ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.6)' }}>
{ach.name}
</p>
<p className="font-body text-[11px] text-[rgb(var(--muted))] mt-0.5">{ach.desc}</p>
</div>
</div>
);
})}
</div>
</div>

{isPremium ? (
<button
onClick={() => setActiveTab('marketplace')}
className="font-body w-full text-[rgb(var(--gold))] font-medium py-3.5 rounded-2xl transition-all text-[13px] tracking-[0.05em]"
style={cardStyle}
>
{t("Enter the Marketplace")}
</button>
) : premiumStatus === 'pending' ? (
<div
className="w-full text-[rgb(var(--muted))] font-medium py-3.5 rounded-2xl text-[13px] tracking-[0.05em] text-center"
style={cardStyle}
>
{t("Payment Pending Review")}
</div>
) : (
<button
onClick={goPremium}
className="font-body w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-2xl transition-all text-[13px] tracking-[0.05em]"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
<Crown className="w-4 h-4" />
{premiumExpired ? t('Premium ended — Renew') : t('Go Premium')}
</button>
)}
</div>
</div>
)}
</div>
</div>

{showPlan && (
<FullPlanModal
isPremium={isPremium}
onClose={() => setShowPlan(false)}
onGoPremium={goPremium}
onGoScan={() => setActiveTab('scan')}
/>
)}

{showOnboarding && userId && (
<Onboarding
userId={userId}
onDone={(answers, goScan) => {
setOnboarding(answers);
setShowOnboarding(false);
if (goScan) setActiveTab('scan');
}}
/>
)}

{showPremiumModal && (
<PremiumModal
onClose={() => setShowPremiumModal(false)}
onConfirm={submitPaymentClaim}
submitting={submittingPayment}
/>
)}

<BottomNav activeTab={activeTab} onChange={setActiveTab} />
</div>
);
}

