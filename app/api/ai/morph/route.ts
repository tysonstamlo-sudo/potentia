// app/api/ai/morph/route.ts — "Your best version": the same person at their realistic peak.
// Silver, Gold and Platinum only. 5 per day. The photo is sent to Google's AI and not stored by Potentia.

import { getUser, hasPaidPremium, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, editImage } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 5;

function prompt(gender: 'male' | 'female') {
const male = gender === 'male';
return [
`Edit this photo to show the same ${male ? 'man' : 'woman'} at their realistic facial potential:`,
'how they would look after months of getting lean, a good skincare routine, sleep and grooming.',
'The change must be clearly noticeable at first glance, but believable. Not a different person, not a filter.',
'',
'IDENTITY (most important, never change these):',
'- They must be instantly recognisable as the same person to anyone who knows them.',
'- Keep their ethnicity, skin tone, age, gender, eye shape and eye colour, nose shape, lip shape and overall bone structure.',
'- Never turn them into a model, a celebrity or a "generic handsome/pretty" face.',
'',
'KEEP EXACTLY THE SAME:',
'- camera angle, framing, head position and facial expression',
'- hairstyle, hair length and hair colour',
'- lighting direction, background and clothing',
'- any moles, scars or marks',
'',
'IMPROVE:',
...(male
? [
'- Leaner face: remove puffiness and water retention, less fat under the chin and on the cheeks.',
'- Clearer jawline and jaw angles, slightly more defined chin, visible cheekbones (from leanness, not new bones).',
'- Eye area: no dark circles or bags, more rested and confident look, slightly lower and fuller brows.',
'- Skin: clearer and more even, no acne or redness, healthy tone, real texture and pores kept.',
'- Slightly better symmetry, keeping their natural small asymmetries.',
'- Overall: a sharper, more masculine and healthier version of their own face.',
]
: [
'- Leaner, more sculpted face: less puffiness, natural cheekbone definition.',
'- Refined jawline and balanced chin, keeping soft feminine proportions.',
'- Eye area: no dark circles or bags, brighter and more rested look, groomed natural brows.',
'- Skin: clearer and more even, no acne or redness, healthy glow, real texture and pores kept.',
'- Lips and nose in better harmony with the face, without changing their shape.',
'- Slightly better symmetry, keeping their natural small asymmetries.',
'- Overall: a fresher, more feminine and healthier version of their own face.',
]),
'',
'REALISM:',
'- It must look like an unedited real photograph taken with the same camera.',
'- Natural skin with visible pores. No smoothing, no plastic or airbrushed skin, no beauty-filter glow.',
'- No exaggerated jaw, no enlarged eyes, no new nose, no changed proportions.',
`- Do not give a ${male ? 'man feminine' : 'woman masculine'} features.`,
'- No makeup that was not there, no text, logos, watermarks, jewellery, glasses or tattoos.',
'',
'Return only the one edited photo.',
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

