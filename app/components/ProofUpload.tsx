'use client';

// app/components/ProofUpload.tsx — "Upload your payment screenshot" box.
// Saves to the private payment-proofs bucket in the user's own folder. Only they and the admin can see it.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { Loader2, ReceiptText, CheckCircle2 } from 'lucide-react';

/** Shrink a phone screenshot so it uploads fast but the text stays readable. */
export async function compressImage(file: File, max = 1600, quality = 0.85): Promise<Blob> {
const url = URL.createObjectURL(file);
try {
const img = await new Promise<HTMLImageElement>((res, rej) => {
const i = new Image();
i.onload = () => res(i);
i.onerror = rej;
i.src = url;
});
const scale = Math.min(1, max / Math.max(img.width, img.height));
const canvas = document.createElement('canvas');
canvas.width = Math.round(img.width * scale);
canvas.height = Math.round(img.height * scale);
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
return await new Promise<Blob>((res, rej) =>
canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not read image'))), 'image/jpeg', quality),
);
} finally {
URL.revokeObjectURL(url);
}
}

export default function ProofUpload({ onChange }: { onChange: (path: string | null) => void }) {
const { t } = useLang();
const fileRef = useRef<HTMLInputElement | null>(null);
const [preview, setPreview] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');

useEffect(
() => () => {
if (preview) URL.revokeObjectURL(preview);
},
[preview],
);

const pick = async (file: File | undefined) => {
if (!file) return;
setBusy(true);
setError('');
onChange(null);
try {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) throw new Error('Not signed in');
const blob = await compressImage(file);
const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
const { error: upErr } = await supabase.storage
.from('payment-proofs')
.upload(path, blob, { contentType: 'image/jpeg', upsert: false });
if (upErr) throw upErr;
setPreview(old => {
if (old) URL.revokeObjectURL(old);
return URL.createObjectURL(blob);
});
onChange(path);
} catch (e) {
console.error('proof upload failed', e);
setError(t('Could not upload the screenshot. Try again.'));
} finally {
setBusy(false);
}
};

return (
<div>
<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
<button
type="button"
onClick={() => fileRef.current?.click()}
disabled={busy}
className="w-full rounded-2xl p-3 flex items-center gap-3 text-left transition-all disabled:opacity-60"
style={{
background: preview ? 'rgb(var(--gold) / 0.1)' : 'rgb(var(--surface) / 0.5)',
border: `1.5px ${preview ? 'solid' : 'dashed'} ${preview ? 'rgb(var(--gold) / 0.6)' : 'rgb(var(--muted) / 0.35)'}`,
}}
>
<span
className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
style={{ background: 'rgb(var(--muted) / 0.12)' }}
>
{busy ? (
<Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--gold))]" />
) : preview ? (
// eslint-disable-next-line @next/next/no-img-element
<img src={preview} alt="" className="w-full h-full object-cover" />
) : (
<ReceiptText className="w-6 h-6 text-[rgb(var(--gold))]" />
)}
</span>
<span className="min-w-0">
<span className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--gold))]">
{preview && <CheckCircle2 className="w-4 h-4" />}
{preview ? t('Payment screenshot added') : t('Upload payment screenshot')}
</span>
<span className="block text-[11px] text-[rgb(var(--muted))] leading-snug mt-0.5">
{preview ? t('Tap to change it') : t('The receipt from your banking app after you pay. Required.')}
</span>
</span>
</button>
{error && <p className="text-xs text-[rgb(var(--err))] mt-2">{error}</p>}
</div>
);
}

