// app/api/ai/skin/route.ts — Potentia Skin: the AI skin report for one selfie.
// Needs Potentia Skin (a skin plan or a one-time report). 8 per day.
// Reads the person's skin settings: mom mode (pregnancy-safe routine) and budget routine.
// If the phone sends an earlier "before" photo, the AI also compares the two (dark patches faded or not):
// comparing two photos side by side is far more reliable than two separate scores.
// Photos are sent to Google's AI and not stored by Potentia.

import { getUser, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { adminDb } from '../../../../lib/pushServer';
import { aiReady } from '../../../../lib/gemini';

type Img = { mime: string; data: string };

/** Gemini with one or two photos, answering in JSON (same model settings as lib/gemini.ts). */
async function askJSON<T>(images: Img[], prompt: string): Promise<T> {
const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const parts: unknown[] = [{ text: prompt }];
images.forEach((im, i) => {
if (images.length > 1) parts.push({ text: i === 0 ? 'PHOTO 1 = BEFORE:' : 'PHOTO 2 = NOW:' });
parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
});
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
});
const json = (await res.json().catch(() => ({}))) as {
candidates?: { content?: { parts?: { text?: string }[] } }[];
promptFeedback?: { blockReason?: string };
error?: { message?: string };
};
if (!res.ok) throw new Error(json.error?.message || `AI error ${res.status}`);
if (json.promptFeedback?.blockReason) throw new Error(`Blocked: ${json.promptFeedback.blockReason}`);
const text = (json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('');
try {
return JSON.parse(text) as T;
} catch {
const m = text.match(/\{[\s\S]*\}/);
if (m) return JSON.parse(m[0]) as T;
throw new Error('The AI answer could not be read');
}
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 8;

const SKIN_KEYS = ['dark_spots', 'melasma', 'redness', 'oiliness', 'pores', 'acne', 'wrinkles', 'under_eye', 'dullness', 'dryness'] as const;
export type SkinKey = (typeof SKIN_KEYS)[number];
const ZONES = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'chin', 'under_eyes'] as const;

const STEP_TYPES = ['cleanser', 'toner', 'serum', 'treatment', 'moisturizer', 'sunscreen', 'eye', 'mask'] as const;
export type StepType = (typeof STEP_TYPES)[number];
export type SkinStep = { en: string; my: string; why_en: string; why_my: string; type?: StepType };
/** Before vs now, judged by the AI looking at both photos. Changes are % (negative = less / faded). */
export type SkinCompare = {
same_light: boolean;
patches: number;
spots: number;
overall: 'better' | 'same' | 'worse';
note_en: string;
note_my: string;
days: number;
/** when the before photo was taken (ms), so the fade chart only joins comparisons with the same start */
base_at: number;
};
export type SkinReport = {
usable: boolean;
reason?: string;
minor?: boolean;
score: number; // 1-10, overall skin health (10 = excellent)
skin_age: number;
face_box?: { x: number; y: number; w: number; h: number }; // 0-1 of the photo
concerns: { key: SkinKey; severity: number; zones: string[] }[]; // severity 0-10 (10 = very strong)
summary_en: string;
summary_my: string;
am: SkinStep[];
pm: SkinStep[];
compare?: SkinCompare;
};

const prompt = (gender: string, age: number | null, mom: boolean, budget: boolean, beforeDays: number | null) => `You are a careful cosmetic skin analyst for a skincare app used in Myanmar and Thailand.
${beforeDays != null ? `You get TWO selfies of the same ${gender === 'male' ? 'man' : 'woman'}: PHOTO 1 = BEFORE (${beforeDays} days ago), PHOTO 2 = NOW. Score and plan from PHOTO 2 (NOW). Also compare the two.` : `Look at this selfie of a ${gender === 'male' ? 'man' : 'woman'}.`}${age ? ` They say they are ${age}.` : ''} Judge only what is visible.

Return JSON only:
{
"usable": true|false,
"reason": "<if not usable: one short fix, e.g. 'Face the window light' or 'Remove the filter'>",
"minor": true|false, // true if the person looks under 18
"score": <1.0-10.0 overall visible skin health; 5 = average; be honest and calibrated>,
"skin_age": <the age their SKIN looks, a whole number>,
"face_box": {"x":0-1,"y":0-1,"w":0-1,"h":0-1}, // the face skin area (forehead to chin, ear to ear) as parts of the photo
"concerns": [ {"key": one of ${JSON.stringify(SKIN_KEYS)}, "severity": 0-10, "zones": subset of ${JSON.stringify(ZONES)}} ],
"summary_en": "<2 short sentences: the main thing to work on and what is already good>",
"summary_my": "<the same in natural, simple Burmese>",
"am": [ {"type": one of ${JSON.stringify(STEP_TYPES)}, "en": "<step, e.g. 'Gentle cleanser'>", "my": "<Burmese>", "why_en": "<why, very short>", "why_my": "<Burmese>"} ],
"pm": [ same shape ]${beforeDays != null ? `,
"compare": {
"same_light": true|false, // false if lighting, distance, angle or camera clearly differ, so the comparison is weak
"patches": <-100..100: % change in brown patches / melasma from BEFORE to NOW; negative = lighter or smaller; 0 if none in either>,
"spots": <-100..100: % change in small dark spots / acne marks; negative = fewer or lighter>,
"overall": "better"|"same"|"worse",
"note_en": "<1 short sentence on what changed, e.g. 'The patches on both cheeks look lighter.'>",
"note_my": "<the same in simple Burmese>"
}` : ''}
}

Rules:
- Not usable if: no clear real face, heavy filter or beauty mode, very dark or blurry, face covered, or a screen/photo of a photo.
- Include all ten concern keys, severity 0 when absent. "melasma" = larger symmetric brown patches; "dark_spots" = small spots, acne marks, freckles.
- Lighting and camera can fake shine and redness: do not exaggerate.
- Routine: 3-4 AM steps and 3-4 PM steps for THEIR top problems, named by product type and key ingredient (e.g. "Vitamin C serum", "Niacinamide serum", "Sunscreen SPF 50", "Retinol (start 2 nights a week)"). Always include sunscreen in AM. No brand names. Nothing medical; for strong acne or melasma, the last PM "why" says to see a dermatologist.
- Never comment on race or skin colour as a problem. Lighter is not better.${
beforeDays != null
? `
- Comparing: look at the SAME areas in both photos. Do not count lighting, white balance, makeup or camera differences as skin change. If unsure, stay near 0. Real change in a few weeks is usually small (0 to -30%).`
: ''
}${
mom
? `
- SAFETY — she is pregnant or breastfeeding. NEVER suggest retinoids (retinol, retinal, tretinoin, adapalene), hydroquinone, salicylic acid above 2% or peels, benzoyl peroxide above 5%, or any pill. Prefer: gentle cleanser, moisturizer, mineral sunscreen (zinc oxide / titanium dioxide), azelaic acid, vitamin C, niacinamide. The last PM "why" says to check new products with her doctor.`
: ''
}${
budget
? `
- BUDGET routine: at most 3 AM and 3 PM steps, basic product types that are cheap and easy to find in Myanmar pharmacies and supermarkets, at most one active ingredient. The whole routine should cost under 30,000 MMK a month.`
: ''
}`;

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const db = adminDb();
const { data: access } = await db.rpc('skin_access', { p_uid: user.id });
if (!access || access === 'none') return Response.json({ code: 'skin' }, { status: 403 });

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string; age?: number; before?: string; before_at?: number };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const before = body.before ? parseDataUrl(body.before) : null;
const beforeDays =
before && typeof body.before_at === 'number' && body.before_at < Date.now() - 3 * 24 * 3600 * 1000
? Math.round((Date.now() - body.before_at) / (24 * 3600 * 1000))
: null; // compare only with a photo at least 3 days old
const { data: prefs } = await db.from('profiles').select('skin_mom, skin_budget').eq('id', user.id).single();
const mom = !!prefs?.skin_mom;
const budget = !!prefs?.skin_budget;
const gender = body.gender === 'male' ? 'male' : 'female';
const age = typeof body.age === 'number' && body.age >= 18 && body.age <= 95 ? Math.round(body.age) : null;

const left = await takeAiCredit(user.id, 'skin', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const r = await askJSON<SkinReport>(beforeDays != null && before ? [before, image] : [image], prompt(gender, age, mom, budget, beforeDays));
if (!r || r.usable === false) {
await refundAiCredit(user.id, 'skin');
return Response.json({ usable: false, reason: r?.reason ?? 'Use a clear, front-facing selfie in daylight.' });
}
if (r.minor) {
await refundAiCredit(user.id, 'skin');
return Response.json({ usable: false, minor: true });
}
// tidy the answer so the app can trust its shape
const clamp = (n: unknown, lo: number, hi: number, d: number) => (typeof n === 'number' && isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d);
const byKey = new Map((r.concerns ?? []).map(c => [c.key, c]));
const step = (st: SkinStep): SkinStep => ({
type: (STEP_TYPES as readonly string[]).includes(String(st.type)) ? st.type : undefined,
en: String(st.en ?? '').slice(0, 80),
my: String(st.my ?? '').slice(0, 120),
why_en: String(st.why_en ?? '').slice(0, 140),
why_my: String(st.why_my ?? '').slice(0, 200),
});
const clean: SkinReport = {
usable: true,
score: Math.round(clamp(r.score, 1, 10, 5) * 10) / 10,
skin_age: Math.round(clamp(r.skin_age, 15, 90, age ?? 30)),
face_box: r.face_box
? { x: clamp(r.face_box.x, 0, 1, 0.2), y: clamp(r.face_box.y, 0, 1, 0.15), w: clamp(r.face_box.w, 0.05, 1, 0.6), h: clamp(r.face_box.h, 0.05, 1, 0.7) }
: undefined,
concerns: SKIN_KEYS.map(k => {
const c = byKey.get(k);
return { key: k, severity: Math.round(clamp(c?.severity, 0, 10, 0) * 10) / 10, zones: (c?.zones ?? []).filter(z => (ZONES as readonly string[]).includes(z)) };
}),
summary_en: String(r.summary_en ?? '').slice(0, 400),
summary_my: String(r.summary_my ?? '').slice(0, 600),
am: (r.am ?? []).slice(0, budget ? 3 : 5).map(step),
pm: (r.pm ?? []).slice(0, budget ? 3 : 5).map(step),
compare:
beforeDays != null && r.compare
? {
same_light: r.compare.same_light !== false,
patches: Math.round(clamp(r.compare.patches, -100, 100, 0)),
spots: Math.round(clamp(r.compare.spots, -100, 100, 0)),
overall: (['better', 'same', 'worse'] as const).includes(r.compare.overall) ? r.compare.overall : 'same',
note_en: String(r.compare.note_en ?? '').slice(0, 200),
note_my: String(r.compare.note_my ?? '').slice(0, 300),
days: beforeDays,
base_at: Math.round(body.before_at as number),
}
: undefined,
};
// a one-time report is used up now
if (access === 'report') {
const { data: p } = await db.from('profiles').select('skin_reports').eq('id', user.id).single();
await db.from('profiles').update({ skin_reports: Math.max(0, Number(p?.skin_reports ?? 1) - 1) }).eq('id', user.id);
}
return Response.json({ report: clean, left, access });
} catch (e) {
console.error('skin report failed', e);
await refundAiCredit(user.id, 'skin');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

