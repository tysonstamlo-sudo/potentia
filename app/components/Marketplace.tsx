'use client';

import React, { useState } from 'react';
import { Sparkles, Star, ShoppingBag, TrendingUp } from 'lucide-react';
import SellerModal from './SellerModal';
import { useLang } from '../../lib/i18n';

type Product = {
id: number;
name: string;
brand: string;
price: number;
category: string;
rating: number;
reviews: number;
aiRecommended: boolean;
image: string;
};

const products: Product[] = [
{ id: 1, name: 'Hydrating Face Serum', brand: 'Luminous Co.', price: 34, category: 'skincare', rating: 4.8, reviews: 1204, aiRecommended: true, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop' },
{ id: 2, name: 'Adjustable Dumbbell Set', brand: 'IronCore', price: 189, category: 'fitness', rating: 4.9, reviews: 892, aiRecommended: true, image: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=400&h=400&fit=crop' },
{ id: 3, name: 'Whey Protein Isolate', brand: 'PureFuel', price: 45, category: 'nutrition', rating: 4.6, reviews: 2103, aiRecommended: false, image: 'https://images.unsplash.com/photo-1579722820903-eab5e12ee5e3?w=400&h=400&fit=crop' },
{ id: 4, name: 'Beard Grooming Kit', brand: 'Timberline', price: 28, category: 'grooming', rating: 4.7, reviews: 543, aiRecommended: false, image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&h=400&fit=crop' },
{ id: 5, name: 'SPF 50 Daily Moisturizer', brand: 'Luminous Co.', price: 22, category: 'skincare', rating: 4.9, reviews: 1876, aiRecommended: true, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop' },
{ id: 6, name: 'Resistance Bands Set', brand: 'IronCore', price: 24, category: 'fitness', rating: 4.5, reviews: 671, aiRecommended: false, image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop' },
{ id: 7, name: 'Minimalist Watch', brand: 'Verge', price: 120, category: 'style', rating: 4.8, reviews: 398, aiRecommended: false, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&h=400&fit=crop' },
{ id: 8, name: 'Sleep & Recovery Complex', brand: 'PureFuel', price: 32, category: 'nutrition', rating: 4.6, reviews: 745, aiRecommended: true, image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=400&h=400&fit=crop' },
];

const categories = ['all', 'skincare', 'fitness', 'nutrition', 'grooming', 'style'];

const cardStyle: React.CSSProperties = {
background: 'rgb(var(--surface) / 0.5)',
border: '1px solid rgb(var(--muted) / 0.14)',
backdropFilter: 'blur(10px)',
};

export default function Marketplace() {
const { t } = useLang();
const [activeCategory, setActiveCategory] = useState('all');
const [showSeller, setShowSeller] = useState(false);

const filteredProducts = activeCategory === 'all'
? products
: products.filter(p => p.category === activeCategory);

const recommendedProducts = products.filter(p => p.aiRecommended);

return (
<div className="space-y-6 font-body">
<div className="p-5 rounded-2xl" style={cardStyle}>
<span className="text-[10px] tracking-[0.3em] text-[rgb(var(--muted))] uppercase block mb-1.5">{t("Provisions")}</span>
<h2 className="font-display text-xl text-[rgb(var(--gold))] font-semibold">{t("Marketplace")}</h2>
</div>

{/* Recommended strip */}
<div
className="rounded-2xl p-5"
style={{
background: 'linear-gradient(160deg, rgb(var(--gold) / 0.08), rgb(var(--surface) / 0.3))',
border: '1px solid rgb(var(--gold) / 0.22)',
backdropFilter: 'blur(10px)',
}}
>
<div className="flex items-center gap-2 mb-4">
<Sparkles className="w-3.5 h-3.5 text-[rgb(var(--gold))]" />
<span className="text-[10px] tracking-[0.2em] text-[rgb(var(--gold))] uppercase">{t("Recommended for You")}</span>
</div>
<div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1">
{recommendedProducts.map(product => (
<div
key={product.id}
className="w-32 flex-shrink-0 rounded-xl overflow-hidden"
style={{ background: 'rgb(var(--surface) / 0.6)', border: '1px solid rgb(var(--muted) / 0.14)' }}
>
<div className="aspect-square overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={product.image} alt={product.name} className="w-full h-full object-cover" />
</div>
<div className="p-2.5">
<p className="text-xs text-[rgb(var(--muted-hover))] mb-0.5 line-clamp-1">{product.name}</p>
<p className="text-[11px] font-display text-[rgb(var(--gold))]">${product.price}</p>
</div>
</div>
))}
</div>
</div>

{/* Category chips */}
<div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
{categories.map(cat => {
const active = activeCategory === cat;
return (
<button
key={cat}
onClick={() => setActiveCategory(cat)}
className="text-[11px] tracking-wide uppercase whitespace-nowrap rounded-full px-4 py-2 transition-all"
style={{
background: active ? 'rgb(var(--gold))' : 'rgb(var(--muted) / 0.1)',
color: active ? 'rgb(var(--bg))' : 'rgb(var(--muted-hover))',
fontWeight: active ? 600 : 400,
}}
>
{t(cat)}
</button>
);
})}
</div>

{/* Product grid */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
{filteredProducts.map(product => (
<div key={product.id} className="rounded-2xl overflow-hidden group" style={cardStyle}>
<div className="aspect-square relative overflow-hidden" style={{ background: 'rgb(var(--bg))' }}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={product.image}
alt={product.name}
className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>
{product.aiRecommended && (
<div
className="absolute top-2 right-2 backdrop-blur-md rounded-full p-1.5"
style={{ background: 'rgb(var(--bg) / 0.75)', border: '1px solid rgb(var(--gold) / 0.4)' }}
>
<Sparkles className="w-3 h-3 text-[rgb(var(--gold))]" />
</div>
)}
</div>
<div className="p-4">
<p className="text-[11px] text-[rgb(var(--muted))] mb-1">{product.brand}</p>
<h4 className="text-sm text-[rgb(var(--muted-hover))] mb-2 line-clamp-1">{product.name}</h4>
<div className="flex items-center gap-1 mb-3">
<Star className="w-3 h-3 text-[rgb(var(--gold))] fill-[rgb(var(--gold))]" />
<span className="text-xs text-[rgb(var(--muted-hover))]">{product.rating}</span>
<span className="text-xs text-[rgb(var(--muted))]">({product.reviews})</span>
</div>
<div className="flex items-center justify-between">
<span className="font-display text-base font-semibold text-[rgb(var(--gold))]">${product.price}</span>
<button
className="w-9 h-9 rounded-xl flex items-center justify-center"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
aria-label={t('Add to bag')}
>
<ShoppingBag className="w-4 h-4" />
</button>
</div>
</div>
</div>
))}
</div>

{/* Seller CTA */}
<div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={cardStyle}>
<div className="flex items-center gap-3">
<span
className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
style={{ background: 'rgb(var(--gold) / 0.12)' }}
>
<TrendingUp className="w-4 h-4 text-[rgb(var(--gold))]" />
</span>
<div>
<h3 className="text-sm text-[rgb(var(--gold))] font-medium">{t("Sell on Potentia")}</h3>
<p className="text-[11px] text-[rgb(var(--muted))]">{t("Reach people actively improving themselves")}</p>
</div>
</div>
<button
onClick={() => setShowSeller(true)}
className="font-medium py-2 px-4 rounded-xl text-xs whitespace-nowrap"
style={{ background: 'rgb(var(--gold))', color: 'rgb(var(--bg))' }}
>
{t("Become a Seller")}
</button>
</div>

{showSeller && <SellerModal onClose={() => setShowSeller(false)} />}
</div>
);
}

