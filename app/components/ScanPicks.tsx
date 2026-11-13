'use client';

// app/components/ScanPicks.tsx — "Picked for your face": Shop products matched to what the scan found.
// Used on the scan result (pass skin + ai) and at the top of the Shop (uses your last scan).

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../lib/i18n';
import { fmtMMK } from '../../lib/payments';
import { concernsFromScan, picksFor, concernLabel } from '../../lib/recommend';
import { ProductImage, cardStyle, type Product } from './shopShared';
import { Sparkles } from 'lucide-react';

// loaded only when someone taps a product
const ProductSheet = lazy(() => import('./Marketplace').then(m => ({ default: m.ProductSheet })));

type Scan = { skin?: unknown; ai?: unknown };

export default function ScanPicks({
scan,
products: given,
onOpen,
}: {
/** the scan to use. Leave out to use the person's last saved scan. */
scan?: Scan;
/** products already loaded by the parent (the Shop). Leave out to load them here. */
products?: Product[];
/** the Shop opens the product itself. Leave out and this card opens it. */
onOpen?: (p: Product) => void;
}) {
const { lang } = useLang();
const L = (en: string, my: string) => (lang === 'my' ? my : en);
const [loaded, setLoaded] = useState<Product[]>([]);
const [last, setLast] = useState<Scan | null>(null);
const [uid, setUid] = useState<string | null>(null);
const [open, setOpen] = useState<Product | null>(null);

useEffect(() => {
let alive = true;
(async () => {
const {
data: { session },
} = await supabase.auth.getSession();
if (!alive) return;
setUid(session?.user.id ?? null);
if (!given) {
const { data } = await supabase
.from('products')
.select('*')
.eq('active', true)
.eq('hidden_by_admin', false)
.order('created_at', { ascending: false })
.limit(200);
if (alive) setLoaded((data as Product[]) ?? []);
}
if (!scan && session) {
const { data } = await supabase
.from('scans')
.select('skin, ai')
.eq('user_id', session.user.id)
.order('created_at', { ascending: false })
.limit(1)
.maybeSingle();
if (alive) setLast((data as Scan | null) ?? null);
}
})();
return () => {
alive = false;
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const src = scan ?? last;
const products = given ?? loaded;
const picks = useMemo(() => {
if (!src) return [];
const concerns = concernsFromScan(src.skin as Parameters<typeof concernsFromScan>[0], src.ai as Parameters<typeof concernsFromScan>[1]);
return picksFor(products.filter(p => p.seller_id !== uid), concerns);
}, [src, products, uid]);

if (!picks.length) return null;

return (
<div className="p-5 rounded-2xl" style={{ ...cardStyle, border: '1px solid rgb(var(--gold) / 0.3)' }}>
<div className="flex items-center gap-2 mb-1">
<Sparkles className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--muted))] uppercase">{L('Picked for your face', 'သင့်မျက်နှာအတွက် ရွေးထားသည်')}</span>
</div>
<p className="text-xs text-[rgb(var(--muted-hover))] leading-relaxed mb-4">
{L('Based on your scan, these can help most.', 'သင့် scan ရလဒ်အရ ဒါတွေက အကူညီဆုံး ဖြစ်နိုင်ပါတယ်။')}
</p>

<div className="space-y-4">
{picks.map(g => (
<div key={g.concern}>
<p className="text-[12px] font-medium text-[rgb(var(--gold))] mb-2">
{L('For', 'အတွက်')}: {concernLabel(g.concern, lang)}
</p>
<div className="space-y-2">
{g.products.map(p => (
<button
key={p.id}
onClick={() => (onOpen ? onOpen(p) : setOpen(p))}
className="w-full flex items-center gap-3 rounded-xl p-2 text-left"
style={{ background: 'rgb(var(--muted) / 0.08)' }}
>
<div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
<ProductImage src={p.image_url} alt={p.name} className="w-full h-full" />
</div>
<div className="min-w-0 flex-1">
<p className="text-[13px] text-[rgb(var(--muted-hover))] leading-snug line-clamp-2">{p.name}</p>
<p className="text-[10px] text-[rgb(var(--muted))] truncate">{p.shop_name}</p>
</div>
<div className="text-right flex-shrink-0">
<p className="font-display text-sm font-semibold text-[rgb(var(--gold))]">{fmtMMK(p.price_mmk)}</p>
<p className="text-[10px] text-[rgb(var(--gold))]">{L('View', 'ကြည့်ရန်')} →</p>
</div>
</button>
))}
</div>
</div>
))}
</div>

<p className="text-[10px] text-[rgb(var(--muted))] mt-4 leading-relaxed">
{L(
'Sold by independent sellers. Suggestions only, not medical advice.',
'သီးခြား ရောင်းသူများက ရောင်းချပါတယ်။ အကြံပြုချက်သာ ဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာ အကြံဉာဏ် မဟုတ်ပါ။'
)}
</p>

{open && (
<Suspense fallback={null}>
<ProductSheet product={open} isMine={false} onClose={() => setOpen(null)} onOrdered={() => {}} />
</Suspense>
)}
</div>
);
}

