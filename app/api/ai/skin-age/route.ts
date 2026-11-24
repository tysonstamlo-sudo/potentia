// app/api/ai/skin-age/route.ts — "Your skin in 10 years": the same photo aged 10 years two ways,
// without care and with a good routine. An illustration, not a medical prediction.
// Skin plan / Gold / Platinum: 2 a day. One-time report: once, within 2 hours of that report.

import { getUser, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { adminDb } from '../../../../lib/pushServer';
import { aiReady, editImage } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 2;

const base = (gender: string) => `Edit this photo of a ${gender === 'male' ? 'man' : 'woman'} to show the SAME person exactly 10 years older.
Keep: identity, face shape, features, ethnicity, skin tone, expression, hairstyle, clothes, background, camera angle and lighting.
It must look like a real, unfiltered photo with natural skin texture. No text, no watermark. Return only the photo.`;

const NO_CARE = `
Show realistic aging WITHOUT skincare or sun protection for 10 years:
deeper forehead lines and crow's feet, more visible under-eye bags and darkness, more and darker sun spots and pigmentation,
slightly duller and rougher skin, a little loss of firmness along the jaw and cheeks, larger looking pores. Realistic, not exaggerated.`;

const WITH_CARE = `
Show healthy aging WITH 10 years of good skincare, daily sunscreen and sleep:
only fine early lines, even skin tone, few spots, firm cheeks and jaw, bright and smooth healthy skin with natural texture.
Clearly 10 years older, but well cared for.`;

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

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const gender = body.gender === 'male' ? 'male' : 'female';

const left = await takeAiCredit(user.id, 'skin_age', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const [noCare, withCare] = await Promise.all([editImage(image, base(gender) + NO_CARE), editImage(image, base(gender) + WITH_CARE)]);
return Response.json({ noCare, withCare, left });
} catch (e) {
console.error('skin age failed', e);
await refundAiCredit(user.id, 'skin_age');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

