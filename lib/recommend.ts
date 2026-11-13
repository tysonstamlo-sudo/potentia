// lib/recommend.ts — turns a face scan into "what should I buy" picks from the Shop.
// 1) the scan finds what to work on (concerns) 2) each concern is matched to seller products.
// Sellers can tag a product with what it helps ("Helps with"); untagged products are matched by words
// in their name and description, so old products work too.

export type Concern =
| 'dark_circles'
| 'oily'
| 'pores'
| 'redness'
| 'uneven'
| 'eye_area'
| 'skin_general'
| 'face_fat'
| 'jawline';

export const CONCERNS: { key: Concern; en: string; my: string }[] = [
{ key: 'dark_circles', en: 'Dark circles', my: 'မျက်ကွင်းညို' },
{ key: 'oily', en: 'Oily skin', my: 'အဆီပြန်သော အသားအရေ' },
{ key: 'pores', en: 'Pores & blackheads', my: 'ချွေးပေါက်ကျယ် / ဆားဝက်ခြံ' },
{ key: 'redness', en: 'Redness', my: 'အသားအရေ နီခြင်း' },
{ key: 'uneven', en: 'Uneven skin tone', my: 'အသားအရောင် မညီခြင်း' },
{ key: 'eye_area', en: 'Eye area lines', my: 'မျက်လုံးနား အရေးအကြောင်း' },
{ key: 'skin_general', en: 'Clearer skin', my: 'ကြည်လင်သော အသားအရေ' },
{ key: 'face_fat', en: 'Face fat', my: 'မျက်နှာ အဆီ' },
{ key: 'jawline', en: 'Jawline', my: 'မေးရိုး' },
];

export const concernLabel = (c: Concern, lang: string) => {
const f = CONCERNS.find(x => x.key === c);
return f ? (lang === 'my' ? f.my : f.en) : c;
};

// words that mean "this product helps with X" when the seller has not tagged it
const WORDS: Record<Concern, string[]> = {
dark_circles: ['dark circle', 'under eye', 'under-eye', 'eye cream', 'caffeine', 'မျက်ကွင်း'],
oily: ['oil control', 'oily', 'matte', 'niacinamide', 'salicylic', 'clay', 'bha', 'အဆီပြန်'],
pores: ['pore', 'blackhead', 'salicylic', 'bha', 'clay mask', 'ချွေးပေါက်', 'ဆားဝက်ခြံ'],
redness: ['redness', 'sensitive', 'soothing', 'cica', 'centella', 'aloe', 'calming', 'အနီ'],
uneven: ['vitamin c', 'brighten', 'dark spot', 'even tone', 'sunscreen', 'spf', 'အမည်းစက်', 'နေလောင်'],
eye_area: ['eye cream', 'eye serum', 'retinol', 'wrinkle', 'fine line', 'အရေးအကြောင်း'],
skin_general: ['cleanser', 'face wash', 'moisturi', 'serum', 'sunscreen', 'spf', 'acne', 'မျက်နှာသစ်', 'ဝက်ခြံ'],
face_fat: ['gua sha', 'face roller', 'protein', 'green tea', 'creatine', 'jump rope', 'dumbbell', 'ဝိတ်ကျ', 'ပရိုတင်း'],
jawline: ['jawline', 'jaw ', 'mastic', 'chewing gum', 'gua sha', 'မေးရိုး'],
};

type SkinLike = { items?: { key: string; score: number }[] } | null | undefined;
type AiLike = { sub?: { leanness?: number; jaw?: number; skin?: number } | null; bloat?: string | null } | null | undefined;

const SKIN_MAP: Record<string, Concern> = {
dark_circles: 'dark_circles',
redness: 'redness',
evenness: 'uneven',
shine: 'oily',
nose_oil: 'oily',
pores: 'pores',
eye_texture: 'eye_area',
};

/** What this scan says to work on, most important first (max 4). */
export function concernsFromScan(skin: SkinLike, ai: AiLike): Concern[] {
const sev = new Map<Concern, number>();
const add = (c: Concern, s: number) => sev.set(c, Math.max(sev.get(c) ?? 0, s));
for (const it of skin?.items ?? []) {
const c = SKIN_MAP[it.key];
if (c && it.score < 6.5) add(c, 10 - it.score);
}
const sub = ai?.sub;
if (sub?.skin != null && sub.skin < 6) add('skin_general', 10 - sub.skin);
if (ai?.bloat === 'heavy') add('face_fat', 7);
else if (ai?.bloat === 'moderate') add('face_fat', 5.5);
else if (sub?.leanness != null && sub.leanness < 5.5) add('face_fat', 10 - sub.leanness);
if (sub?.jaw != null && sub.jaw < 5.5) add('jawline', 10 - sub.jaw - 0.5);
return [...sev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
}

type ProductLike = { id: string; name: string; description: string; concerns?: string[] | null };

function strength(p: ProductLike, c: Concern) {
if (p.concerns?.includes(c)) return 3; // the seller said so
const text = `${p.name} ${p.description}`.toLowerCase();
return WORDS[c].some(w => text.includes(w)) ? 1 : 0;
}

/** For each concern, the best matching products (no product shown twice). */
export function picksFor<P extends ProductLike>(products: P[], concerns: Concern[], perConcern = 2): { concern: Concern; products: P[] }[] {
const used = new Set<string>();
const out: { concern: Concern; products: P[] }[] = [];
for (const c of concerns) {
const best = products
.filter(p => !used.has(p.id))
.map(p => ({ p, s: strength(p, c) }))
.filter(x => x.s > 0)
.sort((a, b) => b.s - a.s)
.slice(0, perConcern)
.map(x => x.p);
best.forEach(p => used.add(p.id));
if (best.length) out.push({ concern: c, products: best });
}
return out;
}

