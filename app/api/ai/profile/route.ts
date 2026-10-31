// app/api/ai/profile/route.ts — automatic side profile reading from one side photo.
// Premium (including the free trial). 10 per day.

import { getUser, hasPremium, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, visionJSON } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 10;

export type ProfileReading = {
valid: boolean;
reason?: string;
scores?: { jawline: number; chin: number; neck: number; nose: number; lips: number; posture: number };
details?: {
gonial_angle_deg: number | null;
chin_projection: 'recessed' | 'neutral' | 'forward';
forward_head: 'none' | 'mild' | 'noticeable';
under_chin: 'tight' | 'average' | 'soft';
};
strengths?: string[];
tips?: string[];
};

const PROMPT = `You are a strict, honest facial-aesthetics analyst. Look at this SIDE PROFILE photo (the head turned about 90 degrees).

First decide if it is usable: one real person, true side view (not front, not 3/4), face clearly visible, jaw and neck visible.
If not usable return {"valid": false, "reason": "<short reason the user can fix, e.g. 'Turn your head fully to the side'>"}.

If usable, score each from 1 to 10 (one decimal). Be calibrated: an average person scores 5 to 6, 8+ is rare, 9+ is exceptional.
Never flatter. Judge only structure, leanness, grooming and posture. Never comment on ethnicity or skin colour.
- jawline: definition and sharpness from ear to chin, gonial angle (ideal about 115 to 125 degrees)
- chin: projection and shape relative to the lips and nose (recessed chins score lower)
- neck: neck-to-chin angle and fullness under the chin
- nose: profile straightness and proportion to the face
- lips: projection and balance relative to nose and chin (E-line)
- posture: forward head posture (ear should sit above the shoulder)

Return ONLY this JSON:
{
"valid": true,
"scores": {"jawline": n, "chin": n, "neck": n, "nose": n, "lips": n, "posture": n},
"details": {
"gonial_angle_deg": number or null,
"chin_projection": "recessed" | "neutral" | "forward",
"forward_head": "none" | "mild" | "noticeable",
"under_chin": "tight" | "average" | "soft"
},
"strengths": ["<max 2 short honest strengths>"],
"tips": ["<3 short, specific, realistic actions: e.g. lowering body fat, posture and neck exercises, grooming. Never suggest surgery or anything unsafe.>"]
}`;

const clamp = (n: unknown) => Math.max(1, Math.min(10, Math.round(Number(n) * 10) / 10 || 5));

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!(await hasPremium(user.id))) return Response.json({ code: 'premium' }, { status: 403 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const body = (await req.json().catch(() => ({}))) as { image?: string };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });

const left = await takeAiCredit(user.id, 'profile', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const r = await visionJSON<ProfileReading>(image, PROMPT);
if (!r.valid) {
await refundAiCredit(user.id, 'profile');
return Response.json({ valid: false, reason: r.reason ?? 'Take a clear side photo', left: left + 1 });
}
const s = r.scores ?? ({} as NonNullable<ProfileReading['scores']>);
const scores = {
jawline: clamp(s.jawline),
chin: clamp(s.chin),
neck: clamp(s.neck),
nose: clamp(s.nose),
lips: clamp(s.lips),
posture: clamp(s.posture),
};
return Response.json({
valid: true,
scores,
details: r.details ?? null,
strengths: (r.strengths ?? []).slice(0, 2).map(String),
tips: (r.tips ?? []).slice(0, 3).map(String),
left,
});
} catch (e) {
console.error('profile failed', e);
await refundAiCredit(user.id, 'profile');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

