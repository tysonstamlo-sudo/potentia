// lib/scanFeedback.ts
// Compares a new scan with the user's earlier scans and writes feedback that changes over time.

import { METRIC_LABEL } from './improvementPlan';

export type GroupKey = 'symmetry' | 'proportions' | 'eyes' | 'jaw';

export type ScanSnapshot = {
overall: number;
groups: Record<GroupKey, number>;
measurements: { key: string; score: number }[];
created_at?: string;
};

export type Trend = 'first' | 'improving' | 'steady' | 'declining';

export type ScanFeedback = {
trend: Trend;
delta: number; // overall change vs. your recent average
baseline: number | null;
scanNumber: number; // 1 = first scan ever
headline: string;
message: string;
wins: string[]; // what got better
watch: string[]; // what got worse
tips: string[]; // what to do next
};

// Same face, different photo, moves the score by about this much. Changes smaller than this are noise.
const NOISE = 0.3;

const GROUP_LABEL: Record<GroupKey, string> = {
symmetry: 'Symmetry',
proportions: 'Proportions',
eyes: 'Eyes',
jaw: 'Jaw',
};

const GROUP_TIPS: Record<GroupKey, string[]> = {
jaw: [
'Jaw definition responds mostly to body fat. Keep your protein high and your daily steps up.',
'Posture changes how your jaw and neck read. Keep doing chin tucks and stand tall.',
'Cut late-night salty food and alcohol. Water retention softens the jawline first.',
'A beard or stubble shape can sharpen the jaw line. Try a cleaner edge under the jaw.',
],
symmetry: [
'Switch the side you sleep on, or sleep on your back, to avoid pressing one side of your face.',
'Chew on both sides. Most people favour one side without noticing.',
'Try a different hair part. It changes how balanced your face looks.',
'Scan with your head level and the camera at eye height. Tilt makes symmetry look worse than it is.',
],
eyes: [
'Sleep is the biggest factor for how your eyes look. Aim for 7+ hours.',
'Tidy your brows. Clean brows frame the eyes.',
'Less salt and alcohol at night means less puffiness around the eyes in the morning.',
'Use sunscreen around the eyes too. It is where skin ages first.',
],
proportions: [
'Proportions are mostly bone, so focus on what frames them: hair, grooming and leanness.',
'A hairstyle with some height balances a longer lower face, and a fuller one balances a long face.',
'Getting leaner changes how your lower face reads more than anything else you control.',
'Keep your scans consistent: same distance, same light, neutral face.',
],
};

const HEADLINES: Record<Trend, string[]> = {
first: ['Your baseline is set'],
improving: ['You are improving', 'Real progress', 'Moving up'],
steady: ['Holding steady', 'Consistent reading', 'Stable'],
declining: ['Your score dropped', 'A step back', 'Lower than your average'],
};

const MESSAGES: Record<Trend, string[]> = {
first: [
'This is your starting point. Scan again in a week or two, in the same light and at the same distance, and we will show you what changed.',
],
improving: [
'Your score is above your recent average by more than normal photo-to-photo variation. Whatever you are doing, keep doing it.',
'This is a real step up, not just a better photo. Your habits are showing.',
'Up again. Stay on your level tasks so this sticks.',
],
steady: [
'Your score is within normal photo variation of your average. Structure changes slowly, so steady is fine. Keep doing your tasks.',
'No big change. That is normal week to week. Progress shows over months, not days.',
'Stable reading. Focus on the area below to start moving it.',
],
declining: [
'Your score is below your recent average by more than normal variation. Check the light, angle and expression first, then look at sleep, salt and body fat.',
'Lower than usual. Before worrying, rescan in good front light with a neutral face. If it is still low, focus on the areas below.',
'A drop. It is often bloating, poor sleep or the photo. Get back on your daily tasks and rescan in a few days.',
],
};

const pick = <T,>(arr: T[], n: number) => arr[((n % arr.length) + arr.length) % arr.length];

export function buildScanFeedback(current: ScanSnapshot, previous: ScanSnapshot[]): ScanFeedback {
// previous: newest first, NOT including the current scan
const scanNumber = previous.length + 1;
const recent = previous.slice(0, 3);

// Weakest group right now, used for tips in every case
const groupKeys = Object.keys(GROUP_LABEL) as GroupKey[];
const weakest = [...groupKeys].sort((a, b) => current.groups[a] - current.groups[b]);

if (recent.length === 0) {
return {
trend: 'first',
delta: 0,
baseline: null,
scanNumber,
headline: HEADLINES.first[0],
message: MESSAGES.first[0],
wins: [],
watch: [],
tips: [pick(GROUP_TIPS[weakest[0]], 0), pick(GROUP_TIPS[weakest[1]], 0)],
};
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const baseline = avg(recent.map(s => Number(s.overall)));
const delta = Math.round((current.overall - baseline) * 10) / 10;
const trend: Trend = delta > NOISE ? 'improving' : delta < -NOISE ? 'declining' : 'steady';

// Group changes vs. the recent average
const groupDelta = groupKeys.map(k => {
const base = avg(recent.map(s => Number(s.groups?.[k] ?? current.groups[k])));
return { k, d: current.groups[k] - base };
});
const wins = groupDelta
.filter(g => g.d >= 0.4)
.sort((a, b) => b.d - a.d)
.map(g => `${GROUP_LABEL[g.k]} up ${g.d.toFixed(1)}`);
const watch = groupDelta
.filter(g => g.d <= -0.4)
.sort((a, b) => a.d - b.d)
.map(g => `${GROUP_LABEL[g.k]} down ${Math.abs(g.d).toFixed(1)}`);

// Measurement-level wins, compared with the last scan
const last = previous[0];
const lastScore = new Map(last.measurements?.map(m => [m.key, Number(m.score)]) ?? []);
current.measurements
.map(m => ({ key: m.key, d: m.score - (lastScore.get(m.key) ?? m.score) }))
.filter(m => m.d >= 1.5)
.sort((a, b) => b.d - a.d)
.slice(0, 2)
.forEach(m => wins.push(`${METRIC_LABEL[m.key] ?? m.key} improved`));

// Tips: focus on what dropped first, otherwise the weakest area.
// The scan number rotates the advice so it is not the same every time.
const worst = groupDelta.filter(g => g.d <= -0.4).sort((a, b) => a.d - b.d).map(g => g.k);
const focus = [...worst, ...weakest.filter(k => !worst.includes(k))].slice(0, 2);
const tips = focus.map((k, i) => pick(GROUP_TIPS[k], scanNumber + i));
if (trend === 'declining') {
tips.unshift('Rescan in front light, camera at eye height, neutral face, before you change anything.');
}

return {
trend,
delta,
baseline: Math.round(baseline * 10) / 10,
scanNumber,
headline: pick(HEADLINES[trend], scanNumber),
message: pick(MESSAGES[trend], scanNumber),
wins: wins.slice(0, 3),
watch: watch.slice(0, 2),
tips: tips.slice(0, 3),
};
}