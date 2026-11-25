// lib/uv.ts — cities for the morning sun alert, and today's UV from Open-Meteo (free, no key).
// Keep the city keys in sync with skin_cities() in skin-niche.sql.

export const CITIES: Record<string, { en: string; my: string; lat: number; lon: number; tz: string }> = {
yangon: { en: 'Yangon', my: 'ရန်ကုန်', lat: 16.84, lon: 96.17, tz: 'Asia/Yangon' },
mandalay: { en: 'Mandalay', my: 'မန္တလေး', lat: 21.97, lon: 96.08, tz: 'Asia/Yangon' },
naypyitaw: { en: 'Nay Pyi Taw', my: 'နေပြည်တော်', lat: 19.76, lon: 96.08, tz: 'Asia/Yangon' },
taunggyi: { en: 'Taunggyi', my: 'တောင်ကြီး', lat: 20.78, lon: 97.04, tz: 'Asia/Yangon' },
mawlamyine: { en: 'Mawlamyine', my: 'မော်လမြိုင်', lat: 16.49, lon: 97.63, tz: 'Asia/Yangon' },
bago: { en: 'Bago', my: 'ပဲခူး', lat: 17.34, lon: 96.48, tz: 'Asia/Yangon' },
pathein: { en: 'Pathein', my: 'ပုသိမ်', lat: 16.78, lon: 94.73, tz: 'Asia/Yangon' },
myitkyina: { en: 'Myitkyina', my: 'မြစ်ကြီးနား', lat: 25.38, lon: 97.4, tz: 'Asia/Yangon' },
bangkok: { en: 'Bangkok', my: 'ဘန်ကောက်', lat: 13.75, lon: 100.5, tz: 'Asia/Bangkok' },
chiang_mai: { en: 'Chiang Mai', my: 'ချင်းမိုင်', lat: 18.79, lon: 98.98, tz: 'Asia/Bangkok' },
};
export const CITY_KEYS = Object.keys(CITIES);

/** Today's highest UV index for a city, or null if the weather service didn't answer. */
export async function uvToday(city: string): Promise<number | null> {
const c = CITIES[city];
if (!c) return null;
try {
const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=uv_index_max&timezone=${encodeURIComponent(c.tz)}&forecast_days=1`;
const res = await fetch(url, { cache: 'no-store' });
if (!res.ok) return null;
const j = (await res.json()) as { daily?: { uv_index_max?: (number | null)[] } };
const v = j.daily?.uv_index_max?.[0];
return typeof v === 'number' ? Math.round(v) : null;
} catch {
return null;
}
}

const toMyDigits = (s: string) => s.replace(/[0-9]/g, d => '၀၁၂၃၄၅၆၇၈၉'[Number(d)]);

/** The morning message for a UV level (bilingual, like the other alerts). Null = no alert needed. */
export function uvMessage(uv: number, city: string): { title: string; body: string; url: string } | null {
const c = CITIES[city];
if (!c || uv < 3) return null;
const n = toMyDigits(String(uv));
if (uv >= 11)
return {
title: `☀️ UV ${uv} in ${c.en} today — extreme`,
body: `Sunscreen SPF 50 before you go out, again at lunch. Umbrella or hat, avoid 11am–3pm sun.\n${c.my}မှာ ဒီနေ့ UV ${n} — အရမ်းပြင်း။ နေကာ SPF 50 လိမ်း၊ ထီး/ဦးထုပ် ယူပါ။`,
url: '/?tab=scan&mode=skin',
};
if (uv >= 8)
return {
title: `☀️ UV ${uv} in ${c.en} today — very high`,
body: `Sunscreen before you leave, reapply at lunch, umbrella or hat. Sun is the #1 cause of dark patches.\n${c.my}မှာ ဒီနေ့ UV ${n} — ပြင်းတယ်။ နေကာ လိမ်းပြီးမှ ထွက်ပါ။ နေရောင်က တင်းကွက်ရဲ့ အဓိကအကြောင်းရင်းပါ။`,
url: '/?tab=scan&mode=skin',
};
if (uv >= 6)
return {
title: `🌤 UV ${uv} in ${c.en} today — high`,
body: `Sunscreen SPF 30+ this morning keeps dark spots from coming back.\n${c.my}မှာ ဒီနေ့ UV ${n}။ မနက် နေကာ လိမ်းရင် အမည်းစက် ပြန်မထွက်ပါဘူး။`,
url: '/?tab=scan&mode=skin',
};
return {
title: `🌥 UV ${uv} in ${c.en} today`,
body: `Even on cloudy days UV reaches your skin. Sunscreen still counts.\n${c.my}မှာ ဒီနေ့ UV ${n}။ တိမ်ထူလည်း နေကာ လိမ်းပါ။`,
url: '/?tab=scan&mode=skin',
};
}

