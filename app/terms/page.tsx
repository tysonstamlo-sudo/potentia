'use client';

// app/terms/page.tsx

import LegalPage, { CONTACT_EMAIL, CONTACT_OTHER, type Section } from '../components/LegalPage';

const SECTIONS: Section[] = [
{
title: 'Agreement',
body: [
'By creating an account or using Potentia you agree to these terms. If you do not agree, please do not use the app. You must be 16 or older.',
],
},
{
title: 'What Potentia is, and is not',
body: [
'Potentia gives you estimates based on facial landmark ratios and simple skin image analysis, plus a daily habit program. It is for general self-improvement and entertainment.',
[
'Scores are estimates, not facts about your worth or attractiveness. Lighting, camera angle and expression change them.',
'Potentia is not medical, dermatological, dental or psychological advice and does not diagnose anything.',
'Exercises and habits cannot change bone structure.',
'Talk to a doctor before starting a new diet or exercise routine, and stop any exercise that causes pain, jaw clicking or headaches.',
'If you feel very unhappy about your appearance, please talk to someone you trust or a health professional.',
],
],
},
{
title: 'Your account',
body: [
'Keep your login details private. You are responsible for activity on your account. Only scan your own face, or someone else’s face with their permission.',
],
},
{
title: 'Premium and payment',
body: [
[
'Prices: 1 Month 60,000 MMK, 6 Months 299,000 MMK, 1 Year 499,000 MMK. Prices may change for new purchases; we will show the current price before you pay.',
'You pay by scanning our QR code with your banking app and then tapping “I’ve Sent Payment”. Premium starts after we confirm the payment arrived.',
'Premium lasts for the period you bought and then ends automatically. It does not renew by itself. If you renew early, the new time is added on top of the time you have left.',
'Send the exact amount. If a payment cannot be matched, we may ask you for a screenshot of the transfer.',
],
],
},
{
title: 'Refunds',
body: [
[
'If we cannot activate Premium within 48 hours of your payment, contact us and we will either activate it or refund you.',
'If you paid twice or paid the wrong amount by mistake, contact us and we will refund the difference.',
'Once Premium is active, we do not give refunds for time already started, except where the law requires it.',
],
],
},
{
title: 'Levels and rankings',
body: [
'There are two rankings. The Level ranking measures consistency. The Looks ranking orders users by their face score from camera scans; uploaded photos do not count.',
'Face scores are estimates from a photo, not a judgement of your worth. You can hide yourself from the Looks ranking at any time.',
'Do not scan someone else’s face or a photo of another person to get a higher rank. We may remove scores, reset levels or remove users from Rankings if we see cheating, abuse or mocking of other users.',
],
},
{
title: 'Marketplace and sellers',
body: [
'Products shown in the Shop may be sold by third parties. Sellers must apply and be approved, and must only sell real, safe and legal products. We are not responsible for products sold by third-party sellers, but you can report a problem to us.',
[
'Buyers pay Potentia directly. Sellers ship orders after Potentia confirms the payment.',
'Potentia keeps a 20% commission on every sale. Sellers receive the remaining 80%, paid out once a month for the previous month’s confirmed orders.',
'Sellers may not ask buyers to pay them directly outside the app. Doing so can lead to removal from the Shop.',
'If an order is refunded, the commission on that order is also cancelled.',
],
],
},
{
title: 'Acceptable use',
body: [
[
'Do not use Potentia to bully, rate or embarrass other people.',
'Do not upload other people’s photos without their permission.',
'Do not try to break, overload or misuse the app or other people’s accounts.',
],
'We may suspend accounts that break these rules.',
],
},
{
title: 'Limits of our responsibility',
body: [
'We work hard to keep Potentia accurate and available, but we provide it “as is”. To the extent the law allows, we are not responsible for decisions you make based on scores, or for indirect losses. Our total responsibility to you is limited to the amount you paid us in the last 3 months.',
],
},
{
title: 'Changes and contact',
body: [
'We may update these terms. If the changes are important we will tell you in the app. Questions:',
[`Email: ${CONTACT_EMAIL}`, CONTACT_OTHER],
],
},
];

const SUMMARY_MY = `• Potentia ရဲ့ ရမှတ်တွေက ခန့်မှန်းချက်သာ ဖြစ်ပြီး ဆေးပညာ အကြံဉာဏ် မဟုတ်ပါ။
• လေ့ကျင့်ခန်းနဲ့ အရိုးပုံစံကို မပြောင်းနိုင်ပါ။ နာကျင်ရင် ချက်ချင်း ရပ်ပါ။
• ပရီမီယံ: ၁ လ ၆၀,၀၀၀၊ ၆ လ ၂၉၉,၀၀၀၊ ၁ နှစ် ၄၉၉,၀၀၀ ကျပ်။ ငွေရောက်ကြောင်း အတည်ပြုပြီးမှ စတင်ပါမယ်။
• သက်တမ်းကုန်ရင် အလိုအလျောက် ပိတ်သွားပြီး ကိုယ်တိုင် ပြန်ဝယ်ရပါမယ်။ စောစော သက်တမ်းတိုးရင် ကျန်တဲ့ရက်ပေါ် ပေါင်းထည့်ပါမယ်။
• ငွေပေးပြီး ၄၈ နာရီအတွင်း မဖွင့်ပေးနိုင်ရင် ငွေပြန်အမ်းပါမယ်။ ဖွင့်ပြီးသွားရင် ငွေပြန်မအမ်းပါ။
• အခြားသူတွေကို အနိုင်ကျင့်ဖို့ ဒါမှမဟုတ် ခွင့်ပြုချက်မရှိဘဲ သူတို့ဓာတ်ပုံ စကင်န်ဖို့ မသုံးရပါ။
• အသက် ၁၆ နှစ်နှင့်အထက်သာ သုံးရပါမယ်။`;

export default function TermsPage() {
return <LegalPage title="Terms of Use" summaryMy={SUMMARY_MY} sections={SECTIONS} />;
}

