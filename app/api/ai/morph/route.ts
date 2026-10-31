// app/api/ai/morph/route.ts — "Your best version": a realistic glow-up preview of the same person.
// Paid Premium only (not the free trial). 5 per day. The photo is sent to Google's AI and not stored by Potentia.

import { getUser, hasPaidPremium, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, editImage } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 5;

function prompt(gender: 'male' | 'female') {
return [
'Edit this photo of a real person to show a realistic "glow-up" of the SAME person, as if they had spent',
'6 months training, eating well, sleeping properly, following a skincare routine and getting great grooming.',
'',
'KEEP EXACTLY THE SAME: identity, bone structure, face shape, eye shape and eye colour, nose shape,',
'skin tone and ethnicity, age, expression, head pose, camera angle, framing, background and clothing.',
'The person must be instantly recognisable as themselves.',
'',
'IMPROVE ONLY WHAT IS REALISTICALLY CHANGEABLE:',
'- clearer, more even, healthy-looking skin with natural texture and pores still visible (no airbrushing, no plastic look)',
'- less under-eye darkness and puffiness, more rested eyes',
'- slightly leaner face from lower body fat, so the jawline, chin and cheekbones look a little more defined (subtle and believable)',
'- neater, well-shaped, natural eyebrows',
'- healthier hair with a modern, flattering haircut and styling that suits their face',
gender === 'female'
? '- if they wear makeup keep it natural and similar; do not add heavy makeup'
: '- facial hair, if any, neatly groomed; otherwise keep the face clean-shaven as it is',
'- better neck and head posture, soft flattering natural light',
'',
'It must look like an unedited, real smartphone photo of the same person on their best day.',
'Not a filter, not a model, not a different person, not a cartoon. Do not add text, logos, watermarks or jewellery.',
'Return only the edited image.',
].join('\n');
}

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!(await hasPaidPremium(user.id))) return Response.json({ code: 'premium' }, { status: 403 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const body = (await req.json().catch(() => ({}))) as { image?: string; gender?: string };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });
const gender = body.gender === 'female' ? 'female' : 'male';

const left = await takeAiCredit(user.id, 'morph', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const out = await editImage(image, prompt(gender));
return Response.json({ image: out, left });
} catch (e) {
console.error('morph failed', e);
await refundAiCredit(user.id, 'morph');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

