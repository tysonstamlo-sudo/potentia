// app/api/ai/food/route.ts — photo of a meal -> estimated calories, protein, carbs, fat.
// Premium (including the free trial). 25 per day. The user checks and edits before saving.

import { getUser, hasPremium, takeAiCredit, refundAiCredit, parseDataUrl } from '../../../../lib/serverAuth';
import { aiReady, visionJSON } from '../../../../lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PER_DAY = 25;

type Item = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };

const PROMPT = `You are a nutrition expert who knows Myanmar (Burmese), Thai and international food very well.
Look at this photo of food. Identify each separate food or drink and estimate the portion in grams from the plate size,
then estimate calories and macros for that portion. Common Myanmar dishes include mohinga, shan noodles, ohn no khauk swe,
lahpet thoke, curries with rice, fried rice, tea-leaf salad, mont lin ma yar, palata, kyay oh, nan gyi thoke, milk tea.
Count cooking oil (Myanmar curries are oily).

If there is no food in the photo return {"items": [], "note": "No food found"}.

Return ONLY this JSON:
{"items": [{"name": "<short English name>", "grams": n, "kcal": n, "protein": n, "carbs": n, "fat": n}],
"confidence": "low" | "medium" | "high"}
Numbers: kcal whole number, macros in grams with at most one decimal.`;

const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) * 10) / 10 || 0));

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ code: 'auth' }, { status: 401 });
if (!(await hasPremium(user.id))) return Response.json({ code: 'premium' }, { status: 403 });
if (!aiReady()) return Response.json({ code: 'not_ready' }, { status: 503 });

const body = (await req.json().catch(() => ({}))) as { image?: string };
const image = parseDataUrl(body.image);
if (!image) return Response.json({ code: 'bad_image' }, { status: 400 });

const left = await takeAiCredit(user.id, 'food', PER_DAY);
if (left < 0) return Response.json({ code: 'limit', perDay: PER_DAY }, { status: 429 });

try {
const r = await visionJSON<{ items?: Item[]; confidence?: string; note?: string }>(image, PROMPT);
const items = (r.items ?? []).slice(0, 8).map(it => ({
name: String(it.name ?? 'Food').slice(0, 60),
grams: num(it.grams, 3000),
kcal: Math.round(num(it.kcal, 5000)),
protein: num(it.protein, 500),
carbs: num(it.carbs, 800),
fat: num(it.fat, 500),
}));
if (items.length === 0) await refundAiCredit(user.id, 'food');
return Response.json({ items, confidence: r.confidence ?? 'medium', left });
} catch (e) {
console.error('food failed', e);
await refundAiCredit(user.id, 'food');
return Response.json({ code: 'ai_error' }, { status: 502 });
}
}

