'use client';

// app/components/GlowCard.tsx — makes a story-size (1080×1920) card of your tier, level and streak
// that you can share straight to Instagram / TikTok / Telegram, or save to your photos.
// Every share has the app link on it, so every share brings new people.

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../../lib/i18n';
import { faceTiers, faceTier } from '../../lib/faceAnalysis';
import { X, Share2, Download, Loader2, EyeOff, Eye } from 'lucide-react';

type Props = {
username: string;
score: number | null; // steady face score, null if never scanned
scanCount?: number; // camera scans the score is averaged from (top tier needs 3)
gender: 'male' | 'female';
level: number;
streak: number;
xp: number;
onClose: () => void;
};

const W = 1080;
const H = 1920;

function themeRgb(name: string, fallback: string) {
try {
const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
if (v) return v.replace(/\s+/g, ',');
} catch {
/* ignore */
}
return fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
ctx.beginPath();
ctx.moveTo(x + r, y);
ctx.arcTo(x + w, y, x + w, y + h, r);
ctx.arcTo(x + w, y + h, x, y + h, r);
ctx.arcTo(x, y + h, x, y, r);
ctx.arcTo(x, y, x + w, y, r);
ctx.closePath();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
// centred text with letter spacing (canvas letterSpacing isn't on every phone yet)
const chars = text.split('');
const widths = chars.map(c => ctx.measureText(c).width);
const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
let cx = x - total / 2;
const prev = ctx.textAlign;
ctx.textAlign = 'left';
chars.forEach((c, i) => {
ctx.fillText(c, cx, y);
cx += widths[i] + spacing;
});
ctx.textAlign = prev;
}

async function drawCard(p: Omit<Props, 'onClose'>, hideScore: boolean): Promise<HTMLCanvasElement> {
const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d')!;
const gold = themeRgb('--gold', '80,216,255');
const accent = (a: number) => `rgba(${gold},${a})`;
const display = '"Space Grotesk", system-ui, sans-serif';
const body = 'Inter, system-ui, sans-serif';
try {
await document.fonts.ready;
} catch {
/* ignore */
}

// background
const bg = ctx.createLinearGradient(0, 0, 0, H);
bg.addColorStop(0, '#05080b');
bg.addColorStop(1, '#0b1117');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);
// grid
ctx.strokeStyle = accent(0.06);
ctx.lineWidth = 2;
for (let x = 0; x <= W; x += 90) {
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, H);
ctx.stroke();
}
for (let y = 0; y <= H; y += 90) {
ctx.beginPath();
ctx.moveTo(0, y);
ctx.lineTo(W, y);
ctx.stroke();
}
// glow
const glow = ctx.createRadialGradient(W / 2, 820, 50, W / 2, 820, 700);
glow.addColorStop(0, accent(0.28));
glow.addColorStop(1, accent(0));
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

ctx.textAlign = 'center';
ctx.textBaseline = 'alphabetic';

// logo + wordmark
const lg = ctx.createLinearGradient(W / 2 - 60, 170, W / 2 + 60, 290);
lg.addColorStop(0, `rgb(${gold})`);
lg.addColorStop(1, '#0b1117');
ctx.fillStyle = lg;
roundRect(ctx, W / 2 - 60, 170, 120, 120, 32);
ctx.fill();
ctx.fillStyle = '#05080b';
ctx.font = `700 64px ${display}`;
ctx.fillText('P', W / 2, 253);
ctx.fillStyle = `rgb(${gold})`;
ctx.font = `600 40px ${display}`;
spaced(ctx, 'POTENTIA', W / 2, 365, 18);

// name
ctx.fillStyle = 'rgba(255,255,255,0.75)';
ctx.font = `500 44px ${body}`;
ctx.fillText(p.username ? `@${p.username}` : 'My glow-up', W / 2, 470);

// ring
const cx = W / 2;
const cy = 840;
const r = 270;
ctx.lineCap = 'round';
ctx.lineWidth = 34;
ctx.strokeStyle = 'rgba(255,255,255,0.08)';
ctx.beginPath();
ctx.arc(cx, cy, r, 0, Math.PI * 2);
ctx.stroke();
const pct = p.score != null ? Math.max(0.04, Math.min(1, p.score / 10)) : 0.04;
ctx.strokeStyle = `rgb(${gold})`;
ctx.shadowColor = accent(0.8);
ctx.shadowBlur = 40;
ctx.beginPath();
ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hideScore ? 0.999 : pct));
ctx.stroke();
ctx.shadowBlur = 0;

const tiers = faceTiers(p.gender);
const tier = p.score != null ? faceTier(p.score, p.gender, p.scanCount ?? 3) : null;
const tierIdx = tier ? tiers.findIndex(x => x.key === tier.key) : -1;

if (hideScore || p.score == null) {
ctx.fillStyle = `rgb(${gold})`;
const label = tier ? tier.label : '?';
let size = 150;
ctx.font = `700 ${size}px ${display}`;
while (size > 60 && ctx.measureText(label).width > r * 2 - 130) {
size -= 6;
ctx.font = `700 ${size}px ${display}`;
}
ctx.fillText(label, cx, cy + size * 0.3);
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.font = `500 34px ${body}`;
ctx.fillText(tier ? 'FACE TIER' : 'NOT SCANNED YET', cx, cy + 115);
} else {
ctx.fillStyle = `rgb(${gold})`;
ctx.font = `700 190px ${display}`;
ctx.fillText(p.score.toFixed(1), cx, cy + 40);
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.font = `500 38px ${body}`;
ctx.fillText('/ 10 FACE SCORE', cx, cy + 115);
}

// tier pill
if (tier && !hideScore) {
ctx.font = `700 54px ${display}`;
const tw = ctx.measureText(tier.label).width + 100;
ctx.fillStyle = accent(0.16);
roundRect(ctx, cx - tw / 2, 1170, tw, 100, 50);
ctx.fill();
ctx.strokeStyle = accent(0.6);
ctx.lineWidth = 3;
ctx.stroke();
ctx.fillStyle = `rgb(${gold})`;
ctx.fillText(tier.label, cx, 1239);
}

// tier ladder
const ly = 1350;
const lx = 110;
const lw = W - 220;
const seg = lw / tiers.length;
tiers.forEach((t, i) => {
ctx.fillStyle = i <= tierIdx ? `rgb(${gold})` : 'rgba(255,255,255,0.1)';
roundRect(ctx, lx + i * seg + 4, ly, seg - 8, 16, 8);
ctx.fill();
});
ctx.font = `500 22px ${body}`;
ctx.fillStyle = 'rgba(255,255,255,0.4)';
ctx.textAlign = 'left';
ctx.fillText(tiers[0].label, lx, ly + 52);
ctx.textAlign = 'right';
ctx.fillText(tiers[tiers.length - 1].label, lx + lw, ly + 52);
ctx.textAlign = 'center';

// stats
const stats = [
{ v: String(p.level), l: 'LEVEL' },
{ v: String(p.streak), l: 'DAY STREAK' },
{ v: p.xp.toLocaleString('en-US'), l: 'XP' },
];
const sw = (W - 220 - 40) / 3;
stats.forEach((s, i) => {
const x = 110 + i * (sw + 20);
ctx.fillStyle = 'rgba(255,255,255,0.05)';
roundRect(ctx, x, 1470, sw, 190, 36);
ctx.fill();
ctx.strokeStyle = 'rgba(255,255,255,0.1)';
ctx.lineWidth = 2;
ctx.stroke();
ctx.fillStyle = `rgb(${gold})`;
ctx.font = `700 68px ${display}`;
ctx.fillText(s.v, x + sw / 2, 1570);
ctx.fillStyle = 'rgba(255,255,255,0.5)';
ctx.font = `600 24px ${body}`;
spaced(ctx, s.l, x + sw / 2, 1620, 4);
});

// footer
ctx.fillStyle = 'rgba(255,255,255,0.85)';
ctx.font = `600 40px ${body}`;
ctx.fillText("What's your tier? Scan your face free", W / 2, 1765);
ctx.fillStyle = `rgb(${gold})`;
ctx.font = `700 44px ${display}`;
ctx.fillText(window.location.host || 'Potentia', W / 2, 1830);

return canvas;
}

export default function GlowCard(props: Props) {
const { t } = useLang();
const { onClose, ...data } = props;
const [hideScore, setHideScore] = useState(false);
const [url, setUrl] = useState<string | null>(null);
const [blob, setBlob] = useState<Blob | null>(null);
const [busy, setBusy] = useState(false);
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

const render = useCallback(async () => {
const canvas = await drawCard(data, hideScore);
const b = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
if (!b) return;
setBlob(b);
setUrl(old => {
if (old) URL.revokeObjectURL(old);
return URL.createObjectURL(b);
});
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [hideScore, data.score, data.scanCount, data.level, data.streak, data.xp, data.username, data.gender]);

useEffect(() => {
render();
}, [render]);

const share = async () => {
if (!blob) return;
setBusy(true);
const file = new File([blob], 'potentia-glow-card.png', { type: 'image/png' });
try {
const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
if (nav.canShare && nav.canShare({ files: [file] })) {
await nav.share({ files: [file], title: 'Potentia', text: `What's your tier? ${window.location.origin}` });
} else {
save();
}
} catch {
/* user closed the share sheet */
} finally {
setBusy(false);
}
};

const save = () => {
if (!url) return;
const a = document.createElement('a');
a.href = url;
a.download = 'potentia-glow-card.png';
a.click();
};

if (!mounted) return null;
return createPortal(
<div className="fixed inset-0 z-[100] flex flex-col items-center backdrop-blur-md font-body" style={{ background: 'rgb(0 0 0 / 0.85)' }}>
<div
className="w-full max-w-sm flex items-center justify-between px-5"
style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 8px), 48px)' }}
>
<span className="font-display text-sm tracking-[0.15em] text-[rgb(var(--gold))] uppercase">{t('Your Glow Card')}</span>
<button
onClick={onClose}
aria-label="Close"
className="w-9 h-9 rounded-full flex items-center justify-center text-white"
style={{ background: 'rgb(255 255 255 / 0.12)' }}
>
<X className="w-4 h-4" />
</button>
</div>

<div className="flex-1 min-h-0 w-full flex items-center justify-center px-8 py-4">
{url ? (
// eslint-disable-next-line @next/next/no-img-element
<img
src={url}
alt="Glow card"
className="max-h-full max-w-full rounded-3xl"
style={{ aspectRatio: '9 / 16', boxShadow: '0 0 60px rgb(var(--gold) / 0.25)' }}
/>
) : (
<Loader2 className="w-6 h-6 animate-spin text-[rgb(var(--gold))]" />
)}
</div>

<div className="w-full max-w-sm px-5 space-y-3" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 12px), 24px)' }}>
{data.score != null && (
<button
onClick={() => setHideScore(h => !h)}
className="w-full flex items-center justify-center gap-2 text-xs py-2 text-white/70"
>
{hideScore ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
{hideScore ? t('Show my score') : t('Hide my score, show only my tier')}
</button>
)}
<button
onClick={share}
disabled={!blob || busy}
className="w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] disabled:opacity-60"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))', boxShadow: '0 0 24px rgb(var(--gold) / 0.35)' }}
>
{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />} {t('Share to story')}
</button>
<button onClick={save} disabled={!url} className="w-full flex items-center justify-center gap-2 text-sm py-2 text-white/70">
<Download className="w-4 h-4" /> {t('Save image')}
</button>
</div>
</div>,
document.body,
);
}

