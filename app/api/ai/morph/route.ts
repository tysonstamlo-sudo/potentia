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
`Retouch this photo to show this exact ${male ? 'man' : 'woman'} at their peak: the same person after 6 months of`,
'dropping body fat, perfect skincare, great sleep and grooming. Same identity, clearly better face.',
'',
'THE CHANGE MUST BE OBVIOUS. Someone sliding between the original and your result must instantly see the',
'difference in the jaw, cheeks, eyes, eyebrows and skin. If your result looks almost the same as the original, you failed.',
'Make each change below clearly visible, but keep it something a real face could achieve.',
'',
'MAKE THESE CHANGES:',
...(male
? [
'1. Face fat: make the whole face visibly leaner, about 15-20% less soft tissue. Take fat off the cheeks,',
' under the cheekbones, along the jaw and under the chin. The face should look narrower and more angular.',
'2. Jaw: a sharp, clearly visible jawline from ear to chin, with defined jaw angles below the ears and a',
' clean line between jaw and neck. Chin slightly more defined and projected.',
'3. Cheekbones: visible cheekbones with a slight hollow underneath.',
'4. Eyes ("hunter eyes"): the upper eyelid sits closer to the iris so less lid shows, the lower lid line is',
' straighter, the outer corners sit level or slightly higher than the inner corners (a slight positive tilt).',
' No bags, no dark circles, no puffiness. A calm, focused, intense gaze. Keep their own eye shape and colour.',
'5. Eyebrows: thicker and fuller, straighter with only a slight angle, sitting a little lower and closer to the',
' eyes, neatly groomed with clean edges. Natural hairs, not drawn on.',
'6. Skin: clear, even, healthy colour, no spots, redness or shine. Keep real pores and texture.',
'7. Overall: more masculine, sharper and more athletic-looking. Neck slightly thicker and firmer.',
]
: [
'1. Face fat: make the face visibly leaner and more sculpted, about 10-15% less soft tissue, especially',
' under the cheekbones, along the jaw and under the chin.',
'2. Cheekbones: higher, more visible cheekbones with soft natural contour.',
'3. Jaw and chin: a refined, clearly visible jawline and a balanced, defined chin, still soft and feminine.',
'4. Eyes: a lifted almond look with a slight upward tilt at the outer corners, bright and awake.',
' No bags, no dark circles, no puffiness. Keep their own eye shape and colour. No makeup added.',
'5. Eyebrows: fuller and groomed, with a soft natural arch and clean edges. Natural hairs, not drawn on.',
'6. Skin: clear, even, glowing healthy skin, no spots or redness. Keep real pores and texture.',
'7. Lips slightly fuller and better defined, in their own shape.',
'8. Overall: fresher, more feminine and more striking.',
]),
'',
'KEEP: the person must be recognisable as themselves. Same ethnicity, skin tone, age, gender, eye colour,',
' nose shape, hairstyle, expression, head angle, framing, clothes and background.',
'',
'It must look like a real, unfiltered photo with natural skin texture: no plastic skin, no beauty filter, no',
'cartoon or painted look, no oversized eyes. No text, logos or watermarks.',
'',
'Return only the edited photo.',
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

