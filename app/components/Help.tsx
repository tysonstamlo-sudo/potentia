'use client';

// app/components/Help.tsx — Help & FAQ + contact buttons (opened from Settings).

import React, { useState } from 'react';
import { useLang } from '../../lib/i18n';
import { Sheet } from './shopShared';
import { SUPPORT_TELEGRAM, SUPPORT_VIBER, SUPPORT_EMAIL, PAYMENT_HOURS, PAYMENT_SPEED } from '../../lib/brand';
import { ChevronDown, Send, Phone, Mail } from 'lucide-react';

type QA = { q: [string, string]; a: [string, string] };

const FAQ: QA[] = [
{
q: ['How do I pay for Premium?', 'Premium ကို ဘယ်လို ပေးချေရမလဲ?'],
a: [
'Tap Go Premium, pick a plan and your bank (Myanmar or Thai), scan the QR with your banking app, pay, then upload the screenshot of your payment and tap "I’ve Sent Payment".',
'Go Premium ကိုနှိပ်ပြီး plan နဲ့ ဘဏ် (မြန်မာ သို့ ထိုင်း) ကို ရွေးပါ။ ဘဏ် app နဲ့ QR ကို scan ဖတ်ပြီး ငွေလွှဲပါ။ ပြီးရင် ငွေလွှဲ screenshot ကို တင်ပြီး "I’ve Sent Payment" ကို နှိပ်ပါ။',
],
},
{
q: ['When does my Premium start?', 'Premium ဘယ်တော့ စမလဲ?'],
a: [
`As soon as we see your payment in our bank, usually ${PAYMENT_SPEED.en} (${PAYMENT_HOURS.en}). You get a notification when it’s on.`,
`ငွေရောက်တာ တွေ့တာနဲ့ ဖွင့်ပေးပါတယ်။ ပုံမှန်အားဖြင့် ${PAYMENT_SPEED.my} (${PAYMENT_HOURS.my})။ ဖွင့်ပြီးရင် notification ရပါမယ်။`,
],
},
{
q: ['My payment was rejected. Why?', 'ငွေပေးချေမှု ပယ်ချခံရတယ်။ ဘာကြောင့်လဲ?'],
a: [
'We could not find the money, the amount or bank was wrong, or the screenshot was not a real new payment. The reason is shown on your Home screen. Pay again with a screenshot of your own new payment, or contact us below if you did pay.',
'ငွေရောက်တာ မတွေ့လို့၊ ပမာဏ/ဘဏ် မှားလို့ (သို့) screenshot က ငွေလွှဲအသစ် အစစ် မဟုတ်လို့ပါ။ အကြောင်းရင်းကို Home မှာ ပြထားပါတယ်။ ကိုယ်တိုင်လွှဲထားတဲ့ screenshot အစစ်နဲ့ ပြန်ပေးချေပါ (သို့) ငွေလွှဲပြီးသားဆိုရင် အောက်က ဆက်သွယ်ပါ။',
],
},
{
q: ['How does the face scan work?', 'Face scan က ဘယ်လို အလုပ်လုပ်လဲ?'],
a: [
'The app measures your face on your phone, and our AI judge looks at things like face fat, jawline, eyes and skin. Your score is the average of your recent camera scans, so it stays steady. Use good, even light and look straight at the camera.',
'App က သင့်ဖုန်းပေါ်မှာ မျက်နှာကို တိုင်းတာပြီး AI က မျက်နှာအဆီ၊ မေးရိုး၊ မျက်လုံး၊ အသားအရေ စတာတွေကို ကြည့်ပါတယ်။ အမှတ်က မကြာသေးခင် camera scan တွေရဲ့ ပျမ်းမျှဖြစ်လို့ မတည်မငြိမ် မဖြစ်ပါ။ အလင်းကောင်းကောင်းမှာ ကင်မရာကို တည့်တည့် ကြည့်ပါ။',
],
},
{
q: ['How do tiers work?', 'အဆင့် (tier) တွေက ဘယ်လိုလဲ?'],
a: [
'Your tier comes from live camera scans only, not uploaded photos. Chad / Stacy and True Adam / True Eve need 3 camera scans so one lucky photo can’t decide it.',
'Tier ကို camera scan ကနေပဲ ဆုံးဖြတ်ပါတယ်၊ upload ပုံ မပါပါ။ Chad / Stacy နဲ့ True Adam / True Eve ရဖို့ camera scan ၃ ကြိမ် လိုပါတယ်။',
],
},
{
q: ['Are my photos safe?', 'ကျွန်ုပ်ရဲ့ ဓာတ်ပုံတွေ လုံခြုံလား?'],
a: [
'Face measurements run on your phone. One cropped face photo goes to our AI judge (Google Gemini) to score it and is not stored by Potentia. Your progress photos stay on your phone.',
'မျက်နှာ တိုင်းတာမှုကို သင့်ဖုန်းပေါ်မှာပဲ လုပ်ပါတယ်။ မျက်နှာပုံ တစ်ပုံကို AI (Google Gemini) က အမှတ်ပေးဖို့ စစ်ပြီး Potentia က မသိမ်းပါ။ တိုးတက်မှု ဓာတ်ပုံတွေက သင့်ဖုန်းထဲမှာပဲ ရှိပါတယ်။',
],
},
{
q: ['How does the free trial work?', 'အခမဲ့ စမ်းသုံးမှု ဘယ်လိုလဲ?'],
a: [
'7 days of Premium for free, once per phone. When it ends you can keep Premium with a special first-month price.',
'Premium ကို ၇ ရက် အခမဲ့ သုံးနိုင်ပါတယ် (ဖုန်းတစ်လုံး တစ်ကြိမ်)။ ကုန်ရင် ပထမလ အထူးဈေးနဲ့ ဆက်သုံးနိုင်ပါတယ်။',
],
},
{
q: ['How do I buy from the Shop?', 'Shop ကနေ ဘယ်လို ဝယ်ရမလဲ?'],
a: [
'Pay the seller directly with their QR and upload your screenshot. The seller confirms and ships. If something goes wrong, tap Report on the order in My orders and we will step in.',
'ရောင်းသူရဲ့ QR နဲ့ တိုက်ရိုက် ငွေချေပြီး screenshot တင်ပါ။ ရောင်းသူက အတည်ပြုပြီး ပို့ပေးပါမယ်။ ပြဿနာရှိရင် My orders ထဲက Report ကို နှိပ်ပါ။',
],
},
{
q: ['How do I become an affiliate or a seller?', 'Affiliate (သို့) ရောင်းသူ ဘယ်လို ဖြစ်နိုင်မလဲ?'],
a: [
'Affiliate: Settings → Become an affiliate. Seller: Shop → Become a Seller. We review every application.',
'Affiliate: Settings → Become an affiliate။ ရောင်းသူ: Shop → Become a Seller။ လျှောက်လွှာတိုင်းကို စစ်ဆေးပါတယ်။',
],
},
{
q: ['How do I delete my account?', 'အကောင့် ဘယ်လို ဖျက်ရမလဲ?'],
a: [
'Settings → Delete my account. Your data is removed for good.',
'Settings → Delete my account။ သင့်အချက်အလက်တွေကို အပြီးတိုင် ဖျက်ပါမယ်။',
],
},
];

export default function Help({ onClose }: { onClose: () => void }) {
const { lang } = useLang();
const i = lang === 'my' ? 1 : 0;
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [open, setOpen] = useState<number | null>(0);

const contacts: { href: string; label: string; icon: React.ReactNode }[] = [];
const tg: string = SUPPORT_TELEGRAM;
const vb: string = SUPPORT_VIBER;
const em: string = SUPPORT_EMAIL;
if (tg) contacts.push({ href: `https://t.me/${tg}`, label: 'Telegram', icon: <Send className="w-4 h-4" /> });
if (vb) contacts.push({ href: `viber://chat?number=${encodeURIComponent(vb)}`, label: 'Viber', icon: <Phone className="w-4 h-4" /> });
if (em) contacts.push({ href: `mailto:${em}`, label: L('Email', 'အီးမေးလ်'), icon: <Mail className="w-4 h-4" /> });

return (
<Sheet onClose={onClose} title={L('Help & FAQ', 'အကူအညီ')}>
<div className="space-y-5 font-body">
<div
className="rounded-2xl p-5"
style={{ background: 'linear-gradient(160deg, rgb(var(--gold) / 0.12), rgb(var(--surface) / 0.4))', border: '1px solid rgb(var(--gold) / 0.3)' }}
>
<p className="font-display text-lg font-semibold text-[rgb(var(--gold))] mb-1">{L('Need help?', 'အကူအညီ လိုလား?')}</p>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-4">
{L(`We reply ${PAYMENT_HOURS.en}, Myanmar time.`, `${PAYMENT_HOURS.my} (မြန်မာစံတော်ချိန်) အတွင်း ပြန်ဖြေပါတယ်။`)}
</p>
{contacts.length ? (
<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${contacts.length}, minmax(0, 1fr))` }}>
{contacts.map(c => (
<a
key={c.label}
href={c.href}
target="_blank"
rel="noopener noreferrer"
className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{c.icon} {c.label}
</a>
))}
</div>
) : (
<p className="text-[11px] text-[rgb(var(--muted))]">{L('Contact options coming soon.', 'ဆက်သွယ်ရန် မကြာမီ ထည့်ပါမယ်။')}</p>
)}
</div>

<div className="space-y-2">
{FAQ.map((f, n) => {
const isOpen = open === n;
return (
<div key={n} className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--surface) / 0.5)', border: '1px solid rgb(var(--muted) / 0.14)' }}>
<button onClick={() => setOpen(isOpen ? null : n)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
<span className="text-sm font-medium text-[rgb(var(--gold))]">{f.q[i]}</span>
<ChevronDown className="w-4 h-4 flex-shrink-0 text-[rgb(var(--muted))] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
</button>
{isOpen && <p className="px-4 pb-4 text-[13px] leading-relaxed text-[rgb(var(--muted-hover))]">{f.a[i]}</p>}
</div>
);
})}
</div>
</div>
</Sheet>
);
}

