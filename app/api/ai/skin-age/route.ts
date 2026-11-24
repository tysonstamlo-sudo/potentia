// app/api/ai/skin-age/route.ts — "Your skin in 10 years": the same photo aged 10 years two ways,
// without care and with a good routine. An illustration, not a medical prediction.
// Skin plan / Gold / Platinum: 2 a day. One-time report: once, within 2 hours of that report.

import { getUser, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { adminDb } from '../../../../lib/pushServer';
import { aiReady, editImage } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 2;

// Image models overdo aging ("10 years" often comes out as 25-30). So we give the exact
// target age and say plainly how little a face changes in 10 years at that age.
function stage(target: number) {
if (target < 30)
return `At ${target} a person still looks young. NO gray hair, NO receding hairline, NO wrinkles, NO sagging, NO under-eye bags, same face fat and jawline. The face should look almost the same, only the skin itself changes slightly.`;
if (target < 40)
return `At ${target}: no gray hair (at most a couple of strands), same hairline, no deep wrinkles, no sagging. Only very faint early lines may start. The face shape stays the same.`;
if (target < 50)
return `At ${target}: maybe a few gray hairs, faint forehead and smile lines, very slight softening along the jaw. Nothing dramatic.`;
return `At ${target}: natural signs for this age, moderate lines and some gray hair, but no more than a typical person of ${target}.`;
}

const base = (gender: string, age: number | null) => {
const who = gender === 'male' ? 'man' : 'woman';
const ages = age
? `This ${who} is about ${age} years old now. Show the SAME person at age ${age + 10} — exactly ${age + 10}, not older. Most people looking at the result should guess ${age + 10}.\n${stage(age + 10)}`
: `Show the SAME ${who} exactly 10 years older — a small, believable change, not a dramatic one. Do not add gray hair, deep wrinkles or sagging unless the person already looks over 40.`;
return `Edit this photo. ${ages}
Keep exactly: identity, face shape, weight, features, ethnicity, skin tone, expression, hairstyle, hair colour, clothes, background, camera angle and lighting.
It must look like a real, unfiltered phone photo with natural skin texture. Subtle is correct; overdoing it is wrong. No text, no watermark. Return only the photo.`;
};

const NO_CARE = `
Version: 10 years WITHOUT skincare or sun protection. Change only the skin, mildly:
a few more and slightly darker sun spots and freckles on the cheeks and nose, slightly uneven and duller tone, a little more visible pores and oil,
a bit of darkness under the eyes. Keep it realistic for the target age above — do not age the face structure or hair beyond it.`;

const WITH_CARE = `
Version: 10 years WITH daily sunscreen, a simple skincare routine and good sleep:
even, clear, healthy skin with a natural glow and natural texture, almost no spots, bright under-eyes.
The person should look the target age above or a little younger — well cared for, never airbrushed or plastic.`;

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const db = adminDb();
const { data: access } = await db.rpc('skin_access', { p_uid: user.id });
let allowed = access === 'plan' || access === 'premium';
if (!allowed) {
// one-time report buyers: once, right after their report
const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
const [{ count: recentScan }, { count: used }] = await Promise.all([
db.from('skin_scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since).not('report', 'is', null),
db.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'skin_age').gte('created_at', since),
]);
allowed = (recentScan ?? 0) > 0 && (used ?? 0) === 0;
}
if (!allowed) return Response.json({ code: 'skin' }, { status: 403 });

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string; age?: number };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const gender = body.gender === 'male' ? 'male' : 'female';
const age = typeof body.age === 'number' && body.age >= 13 && body.age <= 90 ? Math.round(body.age) : null;

const left = await takeAiCredit(user.id, 'skin_age', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const [noCare, withCare] = await Promise.all([editImage(image, base(gender, age) + NO_CARE), editImage(image, base(gender, age) + WITH_CARE)]);
return Response.json({ noCare, withCare, left });
} catch (e) {
console.error('skin age failed', e);
await refundAiCredit(user.id, 'skin_age');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

