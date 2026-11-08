'use client';

// app/components/Splash.tsx — the opening screen: your P logo rises out of the dark,
// a light sweep runs across the metal, rings turn around it, then POTENTIA spells out.
// Needs public/p-mark.png (the logo with a transparent background).

export default function Splash({ tagline = 'Become your best version' }: { tagline?: string }) {
return (
<div className="ptn-splash">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap');
.ptn-splash {
position: fixed; inset: 0; z-index: 50;
display: flex; flex-direction: column; align-items: center; justify-content: center;
background:
radial-gradient(ellipse at 50% 42%, rgb(var(--gold) / 0.10) 0%, transparent 55%),
radial-gradient(ellipse at 50% 110%, rgb(var(--gold) / 0.08) 0%, transparent 60%),
rgb(var(--bg));
overflow: hidden;
}
/* faint moving grid, like a scanner */
.ptn-grid {
position: absolute; inset: -20%;
background-image:
linear-gradient(rgb(var(--gold) / 0.06) 1px, transparent 1px),
linear-gradient(90deg, rgb(var(--gold) / 0.06) 1px, transparent 1px);
background-size: 44px 44px;
mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 60%);
-webkit-mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 60%);
animation: ptnGrid 6s linear infinite;
}
@keyframes ptnGrid { to { transform: translateY(44px); } }

.ptn-stage { position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; }
.ptn-glow {
position: absolute; width: 190px; height: 190px; border-radius: 50%;
background: radial-gradient(circle, rgb(var(--gold) / 0.45) 0%, rgb(var(--gold) / 0.08) 45%, transparent 70%);
filter: blur(8px);
animation: ptnPulse 2.4s ease-in-out infinite, ptnFadeIn 1s ease-out both;
}
@keyframes ptnPulse { 0%,100% { transform: scale(0.92); opacity: 0.75; } 50% { transform: scale(1.08); opacity: 1; } }

.ptn-ring { position: absolute; inset: 0; animation: ptnSpin 14s linear infinite, ptnFadeIn 1.2s 0.2s ease-out both; }
.ptn-ring.rev { inset: 22px; animation: ptnSpin 9s linear infinite reverse, ptnFadeIn 1.2s 0.35s ease-out both; }
@keyframes ptnSpin { to { transform: rotate(360deg); } }

.ptn-logo-wrap {
position: relative; height: 165px; aspect-ratio: 197 / 288;
animation: ptnRise 1.1s cubic-bezier(.2,.8,.2,1) both, ptnFloat 3.2s 1.1s ease-in-out infinite;
}
.ptn-logo {
width: 100%; height: 100%; object-fit: contain; display: block;
filter: drop-shadow(0 0 14px rgb(var(--gold) / 0.55)) drop-shadow(0 6px 18px rgb(0 0 0 / 0.45));
}
/* light sweep across the metal, clipped to the logo's shape */
.ptn-shine {
position: absolute; inset: 0;
background: linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.85) 48%, rgb(var(--gold) / 0.7) 52%, transparent 70%);
background-size: 300% 100%;
-webkit-mask: url(/p-mark.png) center / contain no-repeat;
mask: url(/p-mark.png) center / contain no-repeat;
mix-blend-mode: screen;
animation: ptnShine 2.6s 0.9s ease-in-out infinite;
}
@keyframes ptnShine { 0% { background-position: 120% 0; } 55%,100% { background-position: -40% 0; } }
@keyframes ptnRise { from { opacity: 0; transform: translateY(26px) scale(0.86); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes ptnFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes ptnFadeIn { from { opacity: 0; } to { opacity: 1; } }

.ptn-word {
margin-top: 34px; font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 700; font-size: 22px;
color: rgb(var(--gold)); text-transform: uppercase; letter-spacing: 0.55em; padding-left: 0.55em;
text-shadow: 0 0 18px rgb(var(--gold) / 0.45);
animation: ptnWord 1.2s 0.5s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes ptnWord { from { opacity: 0; letter-spacing: 1.2em; filter: blur(6px); } to { opacity: 1; letter-spacing: 0.55em; filter: blur(0); } }
.ptn-tag {
margin-top: 12px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; letter-spacing: 0.25em;
text-transform: uppercase; color: rgb(var(--muted));
animation: ptnFadeIn 0.9s 1.1s ease-out both;
}
.ptn-bar { position: absolute; bottom: max(calc(env(safe-area-inset-bottom) + 48px), 64px); width: 120px; height: 2px; border-radius: 2px; background: rgb(var(--muted) / 0.2); overflow: hidden; }
.ptn-bar::after { content: ''; position: absolute; inset: 0; width: 40%; background: rgb(var(--gold)); box-shadow: 0 0 10px rgb(var(--gold)); animation: ptnLoad 1.3s ease-in-out infinite; }
@keyframes ptnLoad { from { transform: translateX(-100%); } to { transform: translateX(260%); } }

@media (prefers-reduced-motion: reduce) {
.ptn-splash *, .ptn-splash *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`}</style>

<div className="ptn-grid" />

<div className="ptn-stage">
<div className="ptn-glow" />
<svg className="ptn-ring" viewBox="0 0 260 260" aria-hidden="true">
<circle cx="130" cy="130" r="126" fill="none" style={{ stroke: 'rgb(var(--gold) / 0.35)' }} strokeWidth="1" strokeDasharray="2 10" />
<circle cx="130" cy="4" r="3" style={{ fill: 'rgb(var(--gold))' }} />
</svg>
<svg className="ptn-ring rev" viewBox="0 0 216 216" aria-hidden="true">
<circle cx="108" cy="108" r="104" fill="none" style={{ stroke: 'rgb(var(--gold) / 0.55)' }} strokeWidth="1.2" strokeDasharray="120 40 8 40" />
</svg>
<div className="ptn-logo-wrap">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/p-mark.png" alt="Potentia" className="ptn-logo" />
<div className="ptn-shine" />
</div>
</div>

<div className="ptn-word">Potentia</div>
<div className="ptn-tag">{tagline}</div>
<div className="ptn-bar" />
</div>
);
}

