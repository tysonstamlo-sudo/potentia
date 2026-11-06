// app/api/ai/rate/route.ts — the AI judge for the face scan.
// Looks at ONE cropped front photo and scores what landmarks can't see:
// face fat / bloat, jaw definition, eye area, masculinity/femininity, skin, harmony.
// The photo is not saved anywhere. Everyone signed in can use it (12 per day).
// If GEMINI_API_KEY isn't set yet, the app just uses the on-device score.

import { getUser, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, visionJSON } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 12;

export type AiSub = {
leanness: number; // 10 = lean, defined face · 1 = very bloated / puffy
jaw: number; // jawline + chin definition
eyes: number; // eye area: shape, tilt, upper eyelid exposure, under-eyes
dimorphism: number; // masculine (men) / feminine (women) features
skin: number; // clarity and texture
harmony: number; // how well everything fits together
};

export type AiRating = {
usable: boolean;
reason?: string;
minor?: boolean;
score?: number; // the AI's final 1–10
sub?: AiSub;
bloat?: 'none' | 'slight' | 'moderate' | 'heavy';
strengths?: string[];
weaknesses?: string[];
};

type Raw = {
usable?: boolean;
reason?: string;
age_estimate?: number;
overall?: number;
leanness?: number;
jaw?: number;
eyes?: number;
dimorphism?: number;
skin?: number;
harmony?: number;
bloat?: string;
strengths?: string[];
weaknesses?: string[];
};

const prompt = (gender: 'male' | 'female') => `You are a strict, experienced facial-aesthetics rater for a looksmaxxing app. Rate this FRONT face photo of a ${gender === 'male' ? 'man' : 'woman'}.

STEP 1 — Is it usable? One real person (not a drawing, not a screen of a cartoon), face clearly visible, roughly front-facing, not heavily filtered.
If not usable return {"usable": false, "reason": "<short fix the user can do, e.g. 'Face the light' or 'Remove the filter'>"}.

STEP 2 — Estimate the person's age as a number. Be honest.

STEP 3 — Score each from 1.0 to 10.0 (one decimal). Use the FULL scale and be calibrated against the general population:
5.0 = truly average. 7 = clearly good-looking. 8 = model level. 9+ = top 0.1%. Most people are 4–6. Never flatter.
Judge bone structure and soft tissue. Never consider ethnicity, skin colour, hair or clothing.
- leanness: facial fat. 9–10 = lean, visible cheekbone hollows and jaw angles. 5 = average. 1–3 = clearly bloated/puffy face, round cheeks, soft or hidden jawline, double chin.
A bloated face MUST score low here even if the proportions are good.
- jaw: jawline sharpness, jaw angle visibility, chin shape and projection. Fat hiding the jaw lowers this.
- eyes: eye shape, positive canthal tilt, upper eyelid exposure (less is better, "hunter eyes"), brow ridge support, under-eye area.
- dimorphism: how ${gender === 'male' ? 'masculine (strong brow, jaw, chin, flat cheeks)' : 'feminine (soft jaw, fuller lips, larger eyes, high cheekbones)'} the face is.
- skin: clarity, texture, acne, redness (only what you can actually see).
- harmony: how well all features fit together; balance and proportion.
- overall: your honest final attractiveness rating on the same calibrated scale. A strongly built, lean face with hunter eyes should score high even if it is not "pretty". A puffy face should be pulled down.

Return ONLY this JSON:
{
"usable": true,
"age_estimate": n,
"overall": n,
"leanness": n, "jaw": n, "eyes": n, "dimorphism": n, "skin": n, "harmony": n,
"bloat": "none" | "slight" | "moderate" | "heavy",
"strengths": ["<max 2 short strengths>"],
"weaknesses": ["<max 2 short weaknesses, specific and fixable when possible>"]
}`;

const s10 = (n: unknown) => {
const v = Number(n);
if (!Number.isFinite(v)) return 5;
return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
};

/** Our own blend of the parts + the AI's overall, so one number can't swing everything. */
function finalScore(r: Raw, sub: AiSub): number {
const parts =
sub.leanness * 0.22 + sub.jaw * 0.2 + sub.eyes * 0.18 + sub.harmony * 0.2 + sub.dimorphism * 0.12 + sub.skin * 0.08;
let score = parts * 0.5 + s10(r.overall) * 0.5;
// heavy bloat caps the score: you can't be top tier with a puffy face
if (r.bloat === 'heavy') score = Math.min(score, 4.8);
else if (r.bloat === 'moderate') score = Math.min(score, 6.2);
return Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
}

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const gender = body.gender === 'female' ? 'female' : 'male';

const left = await takeAiCredit(user.id, 'rate', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const r = await visionJSON<Raw>(image, prompt(gender));
if (!r.usable) {
console.warn('rate not usable', r.reason);
await refundAiCredit(user.id, 'rate');
return Response.json({ usable: false, reason: r.reason ?? 'Use a clear front photo' } satisfies AiRating);
}
// Potentia is 18+. Don't rate people who look clearly underage.
if (typeof r.age_estimate === 'number' && r.age_estimate < 17) {
return Response.json({ usable: false, minor: true } satisfies AiRating);
}
const sub: AiSub = {
leanness: s10(r.leanness),
jaw: s10(r.jaw),
eyes: s10(r.eyes),
dimorphism: s10(r.dimorphism),
skin: s10(r.skin),
harmony: s10(r.harmony),
};
const bloat = (['none', 'slight', 'moderate', 'heavy'] as const).find(b => b === r.bloat) ?? 'slight';
const out: AiRating = {
usable: true,
score: finalScore({ ...r, bloat }, sub),
sub,
bloat,
strengths: (r.strengths ?? []).slice(0, 2).map(String),
weaknesses: (r.weaknesses ?? []).slice(0, 2).map(String),
};
return Response.json(out);
} catch (e) {
console.error('rate failed', e);
await refundAiCredit(user.id, 'rate');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

