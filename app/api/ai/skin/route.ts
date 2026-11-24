// app/api/ai/skin/route.ts — Potentia Skin: the AI skin report for one selfie.
// Needs Potentia Skin (a skin plan, Gold/Platinum Premium, or a one-time report). 8 per day.
// The photo is sent to Google's AI and not stored by Potentia.

import { getUser, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { adminDb } from '../../../../lib/pushServer';
import { aiReady, visionJSON } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 8;

const SKIN_KEYS = ['dark_spots', 'melasma', 'redness', 'oiliness', 'pores', 'acne', 'wrinkles', 'under_eye', 'dullness', 'dryness'] as const;
export type SkinKey = (typeof SKIN_KEYS)[number];
const ZONES = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'chin', 'under_eyes'] as const;

export type SkinStep = { en: string; my: string; why_en: string; why_my: string };
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
};

const prompt = (gender: string, age: number | null) => `You are a careful cosmetic skin analyst for a skincare app used in Myanmar and Thailand.
Look at this selfie of a ${gender === 'male' ? 'man' : 'woman'}${age ? ` who says they are ${age}` : ''}. Judge only what is visible in the photo.

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
"am": [ {"en": "<step, e.g. 'Gentle cleanser'>", "my": "<Burmese>", "why_en": "<why, very short>", "why_my": "<Burmese>"} ],
"pm": [ same shape ]
}

Rules:
- Not usable if: no clear real face, heavy filter or beauty mode, very dark or blurry, face covered, or a screen/photo of a photo.
- Include all ten concern keys, severity 0 when absent. "melasma" = larger symmetric brown patches; "dark_spots" = small spots, acne marks, freckles.
- Lighting and camera can fake shine and redness: do not exaggerate.
- Routine: 3-4 AM steps and 3-4 PM steps for THEIR top problems, named by product type and key ingredient (e.g. "Vitamin C serum", "Niacinamide serum", "Sunscreen SPF 50", "Retinol (start 2 nights a week)"). Always include sunscreen in AM. No brand names. Nothing medical; for strong acne or melasma, the last PM "why" says to see a dermatologist.
- Never comment on race or skin colour as a problem. Lighter is not better.`;

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const db = adminDb();
const { data: access } = await db.rpc('skin_access', { p_uid: user.id });
if (!access || access === 'none') return Response.json({ code: 'skin' }, { status: 403 });

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string; age?: number };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const gender = body.gender === 'male' ? 'male' : 'female';
const age = typeof body.age === 'number' && body.age >= 18 && body.age <= 95 ? Math.round(body.age) : null;

const left = await takeAiCredit(user.id, 'skin', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const r = await visionJSON<SkinReport>(image, prompt(gender, age));
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
am: (r.am ?? []).slice(0, 5).map(s => ({ en: String(s.en ?? '').slice(0, 80), my: String(s.my ?? '').slice(0, 120), why_en: String(s.why_en ?? '').slice(0, 140), why_my: String(s.why_my ?? '').slice(0, 200) })),
pm: (r.pm ?? []).slice(0, 5).map(s => ({ en: String(s.en ?? '').slice(0, 80), my: String(s.my ?? '').slice(0, 120), why_en: String(s.why_en ?? '').slice(0, 140), why_my: String(s.why_my ?? '').slice(0, 200) })),
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

