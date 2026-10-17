/**
* Turns scan measurements into a personalised improvement plan.
*
* HONESTY RULES baked into the content:
* - Bone structure (canthal tilt, eye spacing, nose width, jaw bone) does not
* change with exercise. Those areas get "styling / presentation" levers and
* are labelled low-controllability.
* - Jaw DEFINITION is mostly body fat + muscle + posture, so that is where
* the real gains are.
* - Every lever carries an evidence label so the user knows what is solid.
*/

export type PlanMeasurement = { key: string; score: number; value?: number };

export type Controllability = 'high' | 'medium' | 'low';
export type Evidence = 'solid' | 'mixed' | 'weak';

export type Lever = {
id: string;
title: string;
why: string;
steps: string[];
routine: string; // one-line schedule entry
evidence: Evidence;
caution?: string;
};

export type AreaKey = 'jaw' | 'symmetry' | 'eyes' | 'proportions';

export type FocusArea = {
area: AreaKey;
label: string;
score: number; // average of that area's metric scores, 0..10
controllability: Controllability;
headline: string;
weakest: string[]; // metric keys that dragged it down
levers: Lever[];
};

export type Plan = {
focus: FocusArea[]; // most important first
routine: string[]; // merged daily/weekly checklist
baseline: Lever; // skin + grooming (not measured, always relevant)
note: string;
};

const METRIC_AREA: Record<string, AreaKey> = {
jaw_cheek: 'jaw',
chin_width: 'jaw',
sym_landmarks: 'symmetry',
sym_vertical: 'symmetry',
canthal_tilt: 'eyes',
eye_spacing: 'eyes',
eye_to_face: 'eyes',
nose_icd: 'eyes',
face_hw: 'proportions',
mid_lower: 'proportions',
lower_split: 'proportions',
nose_mouth: 'proportions',
lip_ratio: 'proportions',
};

const AREA_META: Record<AreaKey, { label: string; controllability: Controllability; headline: string }> = {
jaw: {
label: 'Jaw & chin',
controllability: 'high',
headline:
'Jaw definition is mostly leanness, muscle and posture. This is the area where effort pays off most.',
},
symmetry: {
label: 'Symmetry',
controllability: 'low',
headline:
'Mild asymmetry is normal in every face. You can reduce habits that exaggerate it and style around it.',
},
eyes: {
label: 'Eyes & midface',
controllability: 'low',
headline:
'Eye shape and spacing are bone structure and will not change. Sleep, brows and styling change how they read.',
},
proportions: {
label: 'Proportions',
controllability: 'medium',
headline:
'Face proportions are fixed, but haircut, facial hair and leanness change how balanced the face looks.',
},
};

const CONTROL_WEIGHT: Record<Controllability, number> = { high: 1.0, medium: 0.7, low: 0.45 };

/* ---------- lever library ---------- */
const LEVERS: Record<string, Lever> = {
leaner: {
id: 'leaner',
title: 'Get leaner (the biggest jaw lever)',
why: 'Facial fat hides the jaw and chin. Getting leaner is the single most visible change to jaw definition.',
steps: [
'Eat 300–500 kcal under maintenance. Faster than that costs muscle and looks gaunt.',
'Protein around 1.6–2.2 g per kg of bodyweight daily.',
'Sleep 7–9 hours. Short sleep raises water retention and puffiness in the face.',
'Cut salt and alcohol the evening before a photo or scan to reduce facial puffiness.',
],
routine: 'Daily: protein target + small calorie deficit',
evidence: 'solid',
},
chew: {
id: 'chew',
title: 'Chewing (masseter training)',
why: 'The masseter is a muscle and grows with load. A stronger masseter can add width and definition at the jaw angle.',
steps: [
'Chew firm sugar-free gum (or mastic gum) 10–15 minutes a day.',
'Alternate sides so you do not build one side more than the other.',
'Do it 4–5 days a week for at least 4–6 weeks before judging.',
'Stop at the first sign of soreness. Take rest days.',
],
routine: '4–5x/week: 10–15 min chewing, alternate sides',
evidence: 'mixed',
caution:
'Overdoing it can strain the jaw joint (TMJ). Stop if you get clicking, pain or headaches, and see a dentist or doctor if it continues.',
},
neckPosture: {
id: 'neckPosture',
title: 'Neck and posture',
why: 'Forward head posture and a weak neck shorten the visible jawline and add a soft look under the chin.',
steps: [
'Chin tucks: 3 sets of 10, hold 3 seconds each, once a day.',
'Neck curls and neck extensions: 2 sessions a week, 2 sets of 12–15, light weight.',
'Keep screens at eye level and check your head position a few times a day.',
],
routine: 'Daily: 3x10 chin tucks · 2x/week: neck training',
evidence: 'mixed',
},
jawStyle: {
id: 'jawStyle',
title: 'Style the jaw',
why: 'Grooming changes how strong or soft the lower face reads, and it works right away.',
steps: [
'Men: keep the beard line clean and sharp along the jaw and neck, or stay clean-shaven if the jaw is already defined.',
'Ask a barber for tight sides and a cleaner neckline.',
'Avoid heavy hair or collars that cover the jaw in photos.',
],
routine: 'Weekly: neckline and beard line clean-up',
evidence: 'solid',
},
sleepSide: {
id: 'sleepSide',
title: 'Habits that exaggerate asymmetry',
why: 'Chewing on one side, sleeping on one side and leaning your head can slightly exaggerate asymmetry over time.',
steps: [
'Chew on both sides of your mouth.',
'Sleep on your back, or alternate sides, and avoid pressing your face into the pillow.',
'Keep your head level when sitting and on your phone.',
'Photograph from straight on. Small tilts make asymmetry look bigger.',
],
routine: 'Daily: chew both sides · alternate sleep side',
evidence: 'weak',
},
partStyle: {
id: 'partStyle',
title: 'Style around asymmetry',
why: 'A haircut with a deliberate part or fringe balances a face better than a perfectly centered one.',
steps: [
'Try a side part on the side where the face looks smaller or lower.',
'Keep brows evenly groomed. Uneven brows make asymmetry obvious.',
],
routine: 'Monthly: haircut with a barber who knows face shape',
evidence: 'mixed',
},
sleepEyes: {
id: 'sleepEyes',
title: 'Sleep, puffiness and under-eyes',
why: 'Puffy, dark under-eyes make the eye area read tired and smaller, regardless of the underlying shape.',
steps: [
'Sleep 7–9 hours at consistent times.',
'Drink water through the day and cut salt late in the evening.',
'Wear SPF every day. Sun damage darkens the under-eye area.',
'If dark circles persist, see a doctor or dermatologist, as it can have other causes.',
],
routine: 'Daily: 7–9h sleep · SPF · water',
evidence: 'solid',
},
brows: {
id: 'brows',
title: 'Brows and eye framing',
why: 'Brows change how the eyes read, including how tilted or open they look.',
steps: [
'Clean up stray hairs under and between the brows, but do not over-pluck.',
'Keep a natural shape with a slight lift toward the tail.',
'Glasses frames that sit slightly wider than the eyes balance close or wide-set eyes.',
],
routine: 'Every 1–2 weeks: brow clean-up',
evidence: 'mixed',
},
hair: {
id: 'hair',
title: 'Haircut for your face shape',
why: 'Hair adds or removes visual length and width. It is the fastest proportion fix.',
steps: [
'Longer face: add some volume on the sides and keep the top shorter, or add a fringe.',
'Wider face: add height on top and keep the sides tighter.',
'Show your barber a few photos and get a trim every 3–4 weeks.',
],
routine: 'Every 3–4 weeks: trim',
evidence: 'mixed',
},
facialHair: {
id: 'facialHair',
title: 'Facial hair for balance',
why: 'A beard shaped well can lengthen, widen or sharpen the lower face. A bad one makes proportions worse.',
steps: [
'Shorter lower face: let the beard grow slightly longer on the chin.',
'Narrow jaw: fuller on the sides, tight on the neck.',
'Always keep a defined neckline and cheek line.',
],
routine: 'Weekly: shape beard lines',
evidence: 'mixed',
},
proportionLean: {
id: 'proportionLean',
title: 'Leanness changes face width',
why: 'Face width and fullness change with body fat, which shifts the height-to-width balance.',
steps: [
'Use the same leaner approach as for the jaw. Check the face again after losing 3–5 kg.',
],
routine: 'Daily: protein target + small calorie deficit',
evidence: 'solid',
},
};

const BASELINE: Lever = {
id: 'baseline',
title: 'Skin and grooming baseline (not measured, but it matters most)',
why: 'The scan measures structure only. Skin, hair and grooming are what people notice first, and you control all three.',
steps: [
'Morning: gentle cleanser, moisturizer, SPF 30–50.',
'Night: cleanser and moisturizer. Add a retinoid or adapalene only if you get acne or want to improve texture, and start slowly.',
'Keep hair clean, trimmed and shaped. Keep nails and teeth clean.',
'Stay consistent for 8–12 weeks before judging skin changes.',
],
routine: 'Daily: AM cleanser + moisturizer + SPF · PM cleanser + moisturizer',
evidence: 'solid',
};

/** Levers for each area, in priority order. */
const AREA_LEVERS: Record<AreaKey, string[]> = {
jaw: ['leaner', 'neckPosture', 'chew', 'jawStyle'],
symmetry: ['sleepSide', 'partStyle'],
eyes: ['sleepEyes', 'brows'],
proportions: ['hair', 'facialHair', 'proportionLean'],
};

/* ---------- plan builder ---------- */
export function buildPlan(measurements: PlanMeasurement[]): Plan {
const byArea: Record<AreaKey, PlanMeasurement[]> = { jaw: [], symmetry: [], eyes: [], proportions: [] };
for (const m of measurements) {
const a = METRIC_AREA[m.key];
if (a) byArea[a].push(m);
}

const areas: FocusArea[] = (Object.keys(byArea) as AreaKey[])
.filter(a => byArea[a].length > 0)
.map(a => {
const ms = byArea[a];
const score = ms.reduce((s, m) => s + m.score, 0) / ms.length;
const weakest = [...ms].sort((x, y) => x.score - y.score).filter(m => m.score < 7).map(m => m.key);
const meta = AREA_META[a];
return {
area: a,
label: meta.label,
score: Math.round(score * 10) / 10,
controllability: meta.controllability,
headline: meta.headline,
weakest,
levers: AREA_LEVERS[a].map(id => LEVERS[id]),
};
});

// priority = how weak it is x how much you can actually change it
const priority = (f: FocusArea) => (10 - f.score) * CONTROL_WEIGHT[f.controllability];
const needsWork = areas.filter(f => f.score < 8).sort((a, b) => priority(b) - priority(a)).slice(0, 3);
const focus = needsWork.length > 0 ? needsWork : [...areas].sort((a, b) => priority(b) - priority(a)).slice(0, 1);

const seen = new Set<string>();
const routine: string[] = [];
for (const f of focus) {
for (const l of f.levers) {
if (!seen.has(l.routine)) {
seen.add(l.routine);
routine.push(l.routine);
}
}
}
if (!seen.has(BASELINE.routine)) routine.push(BASELINE.routine);

return {
focus,
routine,
baseline: BASELINE,
note:
'This plan targets what the scan found. Exercises and habits improve definition, posture and presentation. They cannot change bone structure. Give each change 6–8 weeks before rescanning.',
};
}

export const METRIC_LABEL: Record<string, string> = {
sym_landmarks: 'Left–right symmetry',
sym_vertical: 'Eye / mouth level',
mid_lower: 'Midface : lower face',
lower_split: 'Upper lip : chin split',
face_hw: 'Face height : width',
nose_mouth: 'Mouth : nose width',
lip_ratio: 'Upper : lower lip',
canthal_tilt: 'Canthal tilt',
eye_spacing: 'Eye spacing',
eye_to_face: 'Eye width : face width',
nose_icd: 'Nose width : eye gap',
jaw_cheek: 'Jaw : cheekbone width',
chin_width: 'Chin height : face',
};

