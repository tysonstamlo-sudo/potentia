'use client';

// app/privacy/page.tsx

import LegalPage, { CONTACT_EMAIL, CONTACT_OTHER, type Section } from '../components/LegalPage';

const SECTIONS: Section[] = [
{
title: 'Who we are',
body: [
'Potentia is a self-improvement app that gives you face and skin readings, a daily task program and progress tracking. This policy explains what information we collect, why, and what you can do about it.',
],
},
{
title: 'Your photos stay on your phone',
body: [
'Face scans run entirely on your device. The photos you take or upload for a scan are not sent to us or stored on our servers. We only save the results of the scan (numbers like your scores and measurements), so we can show your progress over time.',
],
},
{
title: 'AI features that send a photo',
body: [
'Three optional Premium features need a photo to be read by an AI service. They only run when you tap them:',
[
'Your best version (morph): your scan photo is sent to create a realistic preview. We ask for your permission the first time.',
'Side profile scan: the side photo you choose is sent to be scored.',
'Snap your meal: the meal photo you choose is sent to estimate calories.',
],
'These photos are processed by Google (Gemini API) on our behalf and are not stored by Potentia. We only keep the result you choose to save (for example the foods you add to your log). Google processes the photos under its paid API terms, which do not allow using them to train its models.',
],
},
{
title: 'What we collect',
body: [
[
'Account details: your email address, username and gender (gender is only used to choose the right face measurements).',
'Scan results: your overall and group scores, facial measurements as numbers, and skin readings.',
'Activity: tasks you check off, your level, streak, XP and the date you were last active.',
'Onboarding answers: what you want to improve, your routine and your goals.',
'Premium requests: the plan you chose, its status and when it was approved. We do not receive your bank or card details; you pay through your own banking app.',
'Seller applications: the business details and contact information you submit.',
'Shop orders: the name, phone number and delivery address you give when you buy. We share these only with the seller of that order so they can deliver it.',
'Product listings: the photos, names, descriptions and prices sellers post. These are public inside the app.',
'Friends: who you add and who adds you.',
'Nutrition: the foods you log and the goal details you enter (age, height, weight, activity and goal), used only to work out your daily targets.',
'Payment screenshots: the receipt image you upload when you pay, so we can check your payment. Only you and the Potentia team can see it.',
'Free trial and invite checks: when you start a free trial we record a random ID saved on your phone, a "fingerprint" of your phone (for example screen size, graphics chip and time zone, combined into a code) and your IP address. We use these only to stop the same phone from taking more than one free trial, and to check invite rewards.',
],
],
},
{
title: 'How we use it',
body: [
[
'To run your account and show your scores, plan, tasks and progress.',
'To decide when you can rank up (completed task days and scan results).',
'To activate and expire Premium and the free trial.',
'To prevent free-trial abuse (one free trial per phone).',
'To review seller applications and contact sellers.',
'To improve how accurate the scan is, using scan results in aggregate.',
],
'We do not sell your information and we do not use it for advertising.',
],
},
{
title: 'What other users can see',
body: [
'Your username, level and XP appear in the Level ranking. Friends you accept can see your level, XP and streak.',
'If you scan with the camera, your username, face score, face tier (for example HTN) and level appear in the Looks ranking, which other users can see. You can hide yourself at any time with the switch on the Rankings page.',
'Your photos, detailed measurements, skin results and plan are never shown to other users.',
],
},
{
title: 'Where your data is stored',
body: [
'Your data is stored with Supabase (our database provider) and the app is hosted on Vercel. These companies store data on our behalf and may keep it on servers outside Myanmar. They are not allowed to use it for their own purposes.',
],
},
{
title: 'How long we keep it',
body: [
'We keep your data while your account exists. If you ask us to delete your account, we delete your profile, scan results, task history and friend links. Records of payments may be kept for our accounts.',
],
},
{
title: 'Your choices',
body: [
[
'You can stop using the app at any time.',
'You can ask us for a copy of your data, to correct it, or to delete your account, using the contact details below.',
'You can choose not to do skin close-ups; they are optional.',
'You never have to use the AI features (morph, side profile, meal photo). Everything else works without them.',
],
],
},
{
title: 'Age',
body: ['Potentia is for people aged 16 and over. If you are under 16, please do not use the app.'],
},
{
title: 'Changes and contact',
body: [
'If we change this policy we will update the date at the top. For questions or requests, contact us:',
[`Email: ${CONTACT_EMAIL}`, CONTACT_OTHER],
],
},
];

const SUMMARY_MY = `• မျက်နှာ စကင်န် ဓာတ်ပုံတွေက သင့်ဖုန်းထဲမှာပဲ ရှိပါတယ်။ ကျွန်ုပ်တို့ဆီ မပို့ပါ၊ မသိမ်းပါ။
• Morph၊ ဘေးတိုက်မျက်နှာ စကင်န်နဲ့ အစားအစာ ဓာတ်ပုံ (Premium) ကို သုံးမှသာ ဓာတ်ပုံကို Google AI ဆီ ပို့ပါတယ်။ Potentia က မသိမ်းပါ။
• အခမဲ့ စမ်းသုံးမှု တစ်ဖုန်း တစ်ကြိမ်သာ ဖြစ်အောင် ဖုန်း ID၊ ဖုန်း fingerprint နဲ့ IP ကို မှတ်ထားပါတယ်။
• စကင်န်ရလဒ် (ရမှတ်နဲ့ တိုင်းတာချက် ဂဏန်းများ)၊ email၊ username၊ ကျား/မ၊ နေ့စဉ်အလုပ် မှတ်တမ်းနဲ့ ပရီမီယံ တောင်းဆိုချက်ကိုသာ သိမ်းပါတယ်။
• သင့်ဘဏ် အချက်အလက် ကျွန်ုပ်တို့ မရပါ။ သင့်ဘဏ် app ကနေ ကိုယ်တိုင် ငွေပေးချေပါတယ်။
• သင့် အချက်အလက်ကို မရောင်းပါ၊ ကြော်ငြာအတွက် မသုံးပါ။
• အဆင့်ဇယားမှာ username၊ အဆင့်နဲ့ XP ပဲ ပေါ်ပါတယ်။ ရမှတ်နဲ့ ဓာတ်ပုံ မပေါ်ပါ။
• အကောင့် ဖျက်ချင်ရင် ကျွန်ုပ်တို့ကို ဆက်သွယ်ပါ။
• အသက် ၁၆ နှစ်နှင့်အထက်သာ သုံးရပါမယ်။`;

export default function PrivacyPage() {
return <LegalPage title="Privacy Policy" summaryMy={SUMMARY_MY} sections={SECTIONS} />;
}

