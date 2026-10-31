// lib/gemini.ts — talks to Google's Gemini AI. Server-only. Needs GEMINI_API_KEY in Vercel.
// You can switch models later without touching code: set GEMINI_IMAGE_MODEL / GEMINI_TEXT_MODEL in Vercel.

const KEY = process.env.GEMINI_API_KEY ?? '';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

export const aiReady = () => KEY.length > 0;

type Part = {
text?: string;
inlineData?: { mimeType?: string; data?: string };
inline_data?: { mime_type?: string; data?: string };
};
type GeminiResponse = {
candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
promptFeedback?: { blockReason?: string };
error?: { message?: string };
};

async function call(model: string, body: unknown): Promise<GeminiResponse> {
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
body: JSON.stringify(body),
});
const json = (await res.json().catch(() => ({}))) as GeminiResponse;
if (!res.ok) throw new Error(json.error?.message || `AI error ${res.status}`);
if (json.promptFeedback?.blockReason) throw new Error(`Blocked: ${json.promptFeedback.blockReason}`);
return json;
}

/** Edits a photo. Returns a data URL of the new image. */
export async function editImage(image: { mime: string; data: string }, prompt: string): Promise<string> {
const json = await call(IMAGE_MODEL, {
contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: image.mime, data: image.data } }] }],
generationConfig: { responseModalities: ['IMAGE'] },
});
for (const p of json.candidates?.[0]?.content?.parts ?? []) {
const d = p.inlineData?.data ?? p.inline_data?.data;
const m = p.inlineData?.mimeType ?? p.inline_data?.mime_type ?? 'image/png';
if (d) return `data:${m};base64,${d}`;
}
throw new Error('The AI did not return an image');
}

/** Looks at a photo and answers in JSON. */
export async function visionJSON<T>(image: { mime: string; data: string }, prompt: string): Promise<T> {
const json = await call(TEXT_MODEL, {
contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: image.mime, data: image.data } }] }],
generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
});
const text = (json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('');
try {
return JSON.parse(text) as T;
} catch {
const m = text.match(/\{[\s\S]*\}/);
if (m) return JSON.parse(m[0]) as T;
throw new Error('The AI answer could not be read');
}
}

