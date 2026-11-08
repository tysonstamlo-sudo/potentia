'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { ThemeStyles, MarbleBackground, MarbleImage } from '../lib/theme';
import { Flame, Trophy, Target, Star, CheckCircle2, ArrowRight, Droplets, Dumbbell, Sparkles, LogOut, Crown, Share2, Gift, Loader2, XCircle, X } from 'lucide-react';
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
import NotificationToggle from './components/NotificationToggle';
import GlowCard from './components/GlowCard';
import Splash from './components/Splash';
import Settings, { Avatar } from './components/Settings';
import { notify } from '../lib/notify';
import { PAID_TIERS, trialOfferMmk, planMmk, fmtMMK, type Currency } from '../lib/payments';
import { getDeviceId, getFingerprint } from '../lib/device';
import NutritionTracker, { NutritionCard } from './components/NutritionTracker';
import InviteCard, { rememberReferral, applyReferral } from './components/InviteCard';
import TrialSurvey from './components/TrialSurvey';
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
const { t, lang } = useLang();
const router = useRouter();
const [checkingAuth, setCheckingAuth] = useState(true);
const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
const [username, setUsername] = useState('');
const [userId, setUserId] = useState<string | null>(null);
const [email, setEmail] = useState('');
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [showSettings, setShowSettings] = useState(false);

const [totalXP, setTotalXP] = useState(0);
const [level, setLevel] = useState(1);
const [streak, setStreak] = useState(0);
const [isPremium, setIsPremium] = useState(false);
const [premiumExpired, setPremiumExpired] = useState(false);
const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
const [onTrial, setOnTrial] = useState(false);
const [trialUsed, setTrialUsed] = useState(true); // hidden until we know for sure
const [startingTrial, setStartingTrial] = useState(false);
const [trialMsg, setTrialMsg] = useState('');
const [premiumStatus, setPremiumStatus] = useState<'none' | 'pending'>('none');
// last Premium payment you (admin) rejected, with the reason, shown once on Home
const [rejected, setRejected] = useState<{ id: string; reason: string } | null>(null);
const [showPremiumModal, setShowPremiumModal] = useState(false);
const [showPlan, setShowPlan] = useState(false);
const [showOnboarding, setShowOnboarding] = useState(false);
const [tierLabel, setTierLabel] = useState<string | null>(null);
const [subTier, setSubTier] = useState<string | null>(null);
const [offerEnds, setOfferEnds] = useState<number | null>(null); // trial-ending deal deadline (ms)
const [showSurvey, setShowSurvey] = useState(false);
const [showNutrition, setShowNutrition] = useState(false);
const [nutritionKey, setNutritionKey] = useState(0);
const [referralRewards, setReferralRewards] = useState(0);
const [steadyScore, setSteadyScore] = useState<number | null>(null);
const [steadyCount, setSteadyCount] = useState(0);
const [gender, setGender] = useState<'male' | 'female'>('male');
const [showGlow, setShowGlow] = useState(false);
const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
const [submittingPayment, setSubmittingPayment] = useState(false);
const [completedToday, setCompletedToday] = useState<Record<number, string>>({});
const [levelStatus, setLevelStatus] = useState<LevelStatus | null>(null);
const [rankingUp, setRankingUp] = useState(false);
const [rankMsg, setRankMsg] = useState('');
const [saving, setSaving] = useState(false);

// Notifications can open a tab directly, e.g. /?tab=marketplace
useEffect(() => {
try {
rememberReferral(); // keep ?ref=CODE from an invite link until after sign-up
const want = new URLSearchParams(window.location.search).get('tab');
const ok: TabKey[] = ['dashboard', 'scan', 'progress', 'rankings', 'friends', 'marketplace'];
if (want && (ok as string[]).includes(want)) setActiveTab(want as TabKey);
} catch {
/* ignore */
}
}, []);

useEffect(() => {
const init = async () => {
const startTime = Date.now();
const minDuration = 1700; // long enough to see the logo intro, short enough to feel fast

try {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
router.push('/login');
return;
}
setUserId(session.user.id);
setEmail(session.user.email ?? '');
applyReferral(); // links this account to the friend who invited them (only works for new accounts)

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

// Everything else loads at the same time (faster than one after another)
const [{ data: logs }, , { data: ob, error: obError }, { data: requests }, { data: trial, error: trialError }] =
await Promise.all([
supabase
.from('habit_logs')
.select('id, habit_name')
.eq('user_id', session.user.id)
.gte('completed_at', `${todayStr()}T00:00:00`)
.lte('completed_at', `${todayStr()}T23:59:59`),
loadLevelStatus(),
// First-run quiz (separate query so the dashboard still loads if the column is missing)
supabase.from('profiles').select('onboarding, onboarded_at').eq('id', session.user.id).single(),
supabase
.from('premium_requests')
.select('id, status, reject_reason, rejected_at')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1),
supabase.from('profiles').select('trial_used_at, subscription_tier').eq('id', session.user.id).single(),
]);

if (logs) {
const map: Record<number, string> = {};
(logs as { id: string; habit_name: string }[]).forEach(log => {
const match = tasksForLevel(profile?.level ?? 1).find(h => h.name === log.habit_name);
if (match) map[match.id] = log.id;
});
setCompletedToday(map);
}

if (!obError && ob) {
if (ob.onboarding) setOnboarding(ob.onboarding as OnboardingAnswers);
if (!ob.onboarded_at) setShowOnboarding(true);
}

if (requests && requests.length > 0 && requests[0].status === 'pending') {
setPremiumStatus('pending');
}
// Rejected in the last 14 days and not dismissed yet -> tell them why
const last = requests?.[0] as { id: string; status: string; reject_reason?: string | null; rejected_at?: string | null } | undefined;
if (last && last.status === 'rejected' && (!last.rejected_at || Date.now() - new Date(last.rejected_at).getTime() < 14 * 86400000)) {
let seen = false;
try {
seen = localStorage.getItem('ptn_rej_seen') === last.id;
} catch {
/* ignore */
}
if (!seen) setRejected({ id: last.id, reason: last.reject_reason || '' });
}

if (!trialError && trial) {
setTrialUsed(!!trial.trial_used_at);
setSubTier(trial.subscription_tier ?? null);
const exp = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
setOnTrial(trial.subscription_tier === 'trial' && !!exp && exp.getTime() > Date.now());

// Trial-ending deal: from 1 day before the trial ends until 48 hours after
const lastStatus = requests && requests[0] ? requests[0].status : null;
if (trial.subscription_tier === 'trial' && exp && lastStatus !== 'pending' && lastStatus !== 'approved') {
const left = exp.getTime() - Date.now();
if (left <= 24 * 3600 * 1000 && left > -48 * 3600 * 1000) setOfferEnds(exp.getTime() + 48 * 3600 * 1000);
// "What stopped you?" once, after the trial has ended
if (left <= 0) {
let skipped = false;
try {
skipped = localStorage.getItem('ptn_survey_skip') === '1';
} catch {
/* ignore */
}
if (!skipped) {
const { data: fb } = await supabase.from('trial_feedback').select('user_id').eq('user_id', session.user.id).maybeSingle();
if (!fb) setShowSurvey(true);
}
}
}
}

// profile picture (own query, so the app still loads if the column is missing)
const { data: av } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
if (av) setAvatarUrl(((av as { avatar_url?: string | null }).avatar_url as string | null) ?? null);
const { data: rw } = await supabase.from('profiles').select('referral_rewards').eq('id', session.user.id).single();
if (rw) setReferralRewards(Number((rw as { referral_rewards?: number }).referral_rewards ?? 0));
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
supabase
.from('scans')
.select('overall, created_at, source')
.eq('user_id', uid)
.order('created_at', { ascending: false })
.limit(8),
]);
const g = prof?.gender === 'female' ? 'female' : 'male';
setGender(g);
// Same rules as the scan screen: only camera scans, latest + up to 4 more from the last 3 weeks
const camera = ((last ?? []) as { overall: number; created_at: string; source: string | null }[]).filter(
s => (s.source ?? 'camera') !== 'upload',
);
if (camera.length) {
const recent = camera
.filter((s, i) => i === 0 || Date.now() - new Date(s.created_at).getTime() < 21 * 24 * 3600 * 1000)
.slice(0, 5);
const avg = recent.reduce((a, s) => a + Number(s.overall), 0) / recent.length;
const steady = Math.round(avg * 10) / 10;
setSteadyScore(steady);
setSteadyCount(recent.length);
setTierLabel(faceTier(steady, g, recent.length).label);
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

const startTrial = async () => {
if (startingTrial) return;
setStartingTrial(true);
setTrialMsg('');
let data: string | null = null;
try {
const [{ data: { session } }, deviceId, fingerprint] = await Promise.all([supabase.auth.getSession(), getDeviceId(), getFingerprint()]);
const res = await fetch('/api/trial/start', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
body: JSON.stringify({ deviceId, fingerprint }),
});
const json = (await res.json().catch(() => ({}))) as { ends?: string; code?: string };
if (!res.ok) {
const msgs: Record<string, string> = {
device: 'This phone already used its free trial. Go Premium to keep everything unlocked.',
network: 'Too many free trials were started on this network today. Try again later on mobile data.',
used: 'You already used your free trial.',
member: 'The free trial is for new members.',
already: 'You already have Premium.',
};
setStartingTrial(false);
setTrialMsg(t(msgs[json.code ?? ''] ?? 'Could not start the trial. Try again.'));
setTrialUsed(true);
return;
}
data = json.ends ?? null;
} catch {
setStartingTrial(false);
setTrialMsg(t('Could not start the trial. Try again.'));
return;
}
setStartingTrial(false);
setSubTier('trial');
setIsPremium(true);
setOnTrial(true);
setTrialUsed(true);
setPremiumExpired(false);
setPremiumUntil(typeof data === 'string' ? data : new Date(Date.now() + 7 * 86400000).toISOString());
setShowPremiumModal(false);
setTrialMsg(t('Your 7-day Premium trial is on. Enjoy the full reports!'));
};

const submitPaymentClaim = async (plan: string, currency: Currency, proofPath: string, promo?: 'trial_offer') => {
if (!userId) return;
setSubmittingPayment(true);
try {
const { data, error } = await supabase
.from('premium_requests')
.insert({ user_id: userId, status: 'pending', plan, currency, proof_path: proofPath, promo: promo ?? null })
.select('id')
.single();
if (error) throw error;
if (data?.id) notify('premium_request', data.id as string);
setPremiumStatus('pending');
setOfferEnds(null);
setShowPremiumModal(false);
} catch (err) {
console.error('Failed to submit payment claim:', err);
setShowPremiumModal(false);
setTrialMsg(t((err as { message?: string })?.message ?? 'Could not send. Please try again.'));
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
<>
<ThemeStyles />
<Splash tagline={t('Become your best version')} />
</>
);
}

return (
<div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--gold))] overflow-x-hidden relative transition-colors app-enter">
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
@keyframes appEnter { from { opacity: 0; transform: scale(0.985); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
.app-enter { animation: appEnter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.logo-float { animation: logoFloat 3.2s ease-in-out infinite; filter: drop-shadow(0 0 8px rgb(var(--gold) / 0.5)); }
`}</style>

<LanguageStyles />
<div className="relative z-10">
<div
className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-16 w-full"
style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 12px), 52px)' }}
>

{/* Header: logo left, language + theme right. Premium badge sits on its own line so nothing overlaps. */}
<div className="flex items-center justify-between gap-3">
<div className="flex items-center gap-3">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/p-mark.png" alt="Potentia" className="h-9 w-auto flex-shrink-0 logo-float" />
<span className="font-display text-lg tracking-[0.3em] text-[rgb(var(--gold))] uppercase">{t("Potentia")}</span>
</div>
<div className="flex items-center gap-2.5 flex-shrink-0">
<LanguageToggle />
<button onClick={() => setShowSettings(true)} aria-label="Settings" className="rounded-full">
<Avatar url={avatarUrl} name={username} size={38} />
</button>
</div>
</div>
<div className="flex items-center mt-3 mb-10 min-h-[28px]">
{isPremium && (
<div
className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.15em] text-[rgb(var(--gold))] uppercase"
style={{ background: 'rgb(var(--gold) / 0.12)', border: '1px solid rgb(var(--gold) / 0.3)' }}
>
<Crown className="w-3 h-3" />
{onTrial ? t('Free trial') : t("Premium")}
{premiumUntil && (() => {
const d = Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / 86400000);
return <span className="opacity-70 normal-case tracking-normal">· {t('{n}d left', { n: d })}</span>;
})()}
</div>
)}
</div>

{/* Your payment was rejected: why, and pay again */}
{activeTab === 'dashboard' && rejected && (
<div className="mb-6 rounded-2xl p-5 relative" style={{ background: 'rgb(var(--err) / 0.08)', border: '1px solid rgb(var(--err) / 0.35)' }}>
<button
onClick={() => {
try {
localStorage.setItem('ptn_rej_seen', rejected.id);
} catch {
/* ignore */
}
setRejected(null);
}}
className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[rgb(var(--muted))]"
aria-label="Close"
>
<X className="w-4 h-4" />
</button>
<div className="flex items-start gap-3 pr-8">
<XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--err))' }} />
<div>
<p className="font-body text-sm font-semibold" style={{ color: 'rgb(var(--err))' }}>
{lang === 'my' ? 'သင့် Premium ငွေပေးချေမှုကို လက်မခံနိုင်ပါ' : 'Your Premium payment was not accepted'}
</p>
{rejected.reason && <p className="font-body text-xs text-[rgb(var(--muted-hover))] mt-1">“{rejected.reason}”</p>}
<p className="font-body text-xs text-[rgb(var(--muted))] mt-1 leading-relaxed">
{lang === 'my'
? 'ငွေရောက်ကြောင်း မတွေ့ရပါ။ မှန်ကန်တဲ့ ပမာဏနဲ့ ဘဏ်ကို ပြန်စစ်ပြီး ကိုယ်တိုင်လွှဲထားတဲ့ screenshot အစစ်ကို တင်ပါ။ ငွေလွှဲပြီးသားဆိုရင် ကျွန်ုပ်တို့ကို ဆက်သွယ်ပါ။'
: 'We could not find your payment. Check the amount and bank, then send your own real payment screenshot. If you did pay, contact us.'}
</p>
<button onClick={goPremium} className="mt-3 font-body text-xs font-semibold rounded-xl px-4 py-2.5" style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}>
{lang === 'my' ? 'ပြန်ပေးချေရန်' : 'Pay again'}
</button>
</div>
</div>
</div>
)}

{/* Welcome card: only on Home and Progress */}
{(activeTab === 'dashboard' || activeTab === 'progress') && (
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
onClick={() => setShowGlow(true)}
className="font-body flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3.5 py-1.5"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', boxShadow: '0 0 14px rgb(var(--gold) / 0.35)' }}
>
<Share2 className="w-3 h-3" />
{t('Share my Glow Card')}
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
)}

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
<FaceScan
isPremium={isPremium}
onGoPremium={goPremium}
canMorph={isPremium && PAID_TIERS.includes(subTier ?? '')}
onTrial={onTrial}
/>
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
{trialMsg && (
<div className="p-4 rounded-2xl text-sm text-[rgb(var(--gold))]" style={accentCardStyle}>
{trialMsg}
</div>
)}

{!isPremium && !trialUsed && premiumStatus !== 'pending' && (
<div className="p-5 rounded-2xl flex items-center justify-between gap-4" style={accentCardStyle}>
<div className="flex items-start gap-3 min-w-0">
<span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--gold))' }}>
<Gift className="w-5 h-5" style={{ color: 'rgb(var(--bg))' }} />
</span>
<div className="min-w-0">
<p className="font-body text-sm font-semibold text-[rgb(var(--gold))]">{t('Try Premium free for 7 days')}</p>
<p className="font-body text-[11px] text-[rgb(var(--muted-hover))] leading-relaxed">
{t('Full face report, skin analysis and your complete plan. No payment needed.')}
</p>
</div>
</div>
<button
onClick={startTrial}
disabled={startingTrial}
className="font-body flex-shrink-0 flex items-center gap-1.5 font-semibold py-2.5 px-4 rounded-xl text-xs disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{startingTrial ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Start free')}
</button>
</div>
)}

{offerEnds && offerEnds > Date.now() && premiumStatus !== 'pending' && (
<button
onClick={goPremium}
className="w-full text-left p-5 rounded-2xl"
style={{ background: 'linear-gradient(135deg, rgb(var(--gold) / 0.28), rgb(var(--gold) / 0.06))', border: '1px solid rgb(var(--gold) / 0.7)', boxShadow: '0 0 30px rgb(var(--gold) / 0.18)' }}
>
<span className="font-body text-[10px] tracking-[0.25em] text-[rgb(var(--gold))] uppercase font-bold block mb-1">
🎁 {t('Trial offer · ends in {h}h', { h: Math.max(1, Math.ceil((offerEnds - Date.now()) / 3600000)) })}
</span>
<span className="font-display text-xl font-bold text-[rgb(var(--gold))] block">
{t('First month {price}', { price: fmtMMK(trialOfferMmk()) })}
</span>
<span className="font-body text-xs text-[rgb(var(--muted-hover))]">{t('Normally {price}. Keep your full report, plan and progress.', { price: fmtMMK(planMmk('1month')) })}</span>
</button>
)}

{userId && <NutritionCard userId={userId} onOpen={() => setShowNutrition(true)} refreshKey={nutritionKey} />}

{userId && <NotificationToggle userId={userId} />}

{userId && <InviteCard rewards={referralRewards} />}

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
onStartTrial={!isPremium && !trialUsed ? startTrial : undefined}
startingTrial={startingTrial}
offer={!!offerEnds && offerEnds > Date.now()}
/>
)}

{showNutrition && userId && (
<NutritionTracker
userId={userId}
isPremium={isPremium}
onGoPremium={() => {
setShowNutrition(false);
goPremium();
}}
onClose={() => {
setShowNutrition(false);
setNutritionKey(k => k + 1);
}}
/>
)}

{showSurvey && userId && (
<TrialSurvey
userId={userId}
offerOpen={!!offerEnds && offerEnds > Date.now()}
onClose={() => {
try {
localStorage.setItem('ptn_survey_skip', '1');
} catch {
/* ignore */
}
setShowSurvey(false);
}}
onSeeOffer={() => {
setShowSurvey(false);
goPremium();
}}
/>
)}

{showGlow && (
<GlowCard
username={username}
score={steadyScore}
scanCount={steadyCount}
gender={gender}
level={level}
streak={streak}
xp={totalXP}
onClose={() => setShowGlow(false)}
/>
)}

{showSettings && userId && (
<Settings
userId={userId}
email={email}
username={username}
avatarUrl={avatarUrl}
onClose={() => setShowSettings(false)}
onChanged={v => {
if (v.username !== undefined) setUsername(v.username);
if (v.avatarUrl !== undefined) setAvatarUrl(v.avatarUrl);
}}
onLogout={handleLogout}
/>
)}

<BottomNav activeTab={activeTab} onChange={setActiveTab} />
</div>
);
}

