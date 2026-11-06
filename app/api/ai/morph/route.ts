// app/api/ai/morph/route.ts — "Your best version": a strong "max potential" glow-up of the same person.
// Paid Premium only (not the free trial). 5 per day. The photo is sent to Google's AI and not stored by Potentia.

import { getUser, hasPaidPremium, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, editImage } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 5;

function prompt(gender: 'male' | 'female') {
const male = gender === 'male';
return [
'Edit this photo into the "max potential" version of the SAME person: how they would look fully looksmaxxed,',
'like a professional model photo of them at their absolute peak. Make the transformation strong and obvious,',
'the kind of glow-up that makes people say "wow". This is NOT a subtle edit.',
'',
'KEEP: who they are (instantly recognisable as the same person), skin tone and ethnicity, eye colour, age,',
'head pose, camera angle, framing, background, clothing and any marks or scars.',
'',
'TRANSFORM:',
male
? '- very lean face (about 10% body fat): sharp, clearly visible jawline and jaw angles, defined chin, hollow cheeks under high cheekbones, no softness under the chin'
: '- lean, sculpted face: high defined cheekbones, snatched jawline, defined chin, no puffiness',
male
? '- stronger, more masculine structure within what looks natural for them: slightly wider and more angular jaw, a bit more chin projection, a fuller brow ridge'
: '- balanced feminine structure: slightly fuller lips, lifted cheekbones, refined jaw and chin',
male
? '- intense "hunter eyes": eyebrows lower, straighter and thicker, less upper-eyelid showing, relaxed confident gaze, no dark circles'
: '- bright, lifted, almond eyes with a slight positive tilt, groomed full brows, no dark circles',
'- flawless but REAL skin: even tone, no acne or redness, healthy glow, natural pores still visible (no plastic or airbrushed look)',
male
? '- thick, healthy, professionally styled hair in a modern cut that suits the face (textured, volume on top)'
: '- glossy, healthy, professionally styled hair that suits the face',
'- confident, composed expression with a closed mouth; strong neck and upright posture',
'- soft, flattering photo lighting like a modelling shoot, sharp focus, true-to-life colours',
'',
'It must look like a real photograph of a real person, not a drawing, not a filter, not a different person.',
'Do not add text, logos, watermarks, tattoos, piercings, jewellery or glasses. Return only the edited image.',
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

