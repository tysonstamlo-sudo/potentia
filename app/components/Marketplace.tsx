'use client';

import React, { useState } from 'react';
import { Sparkles, Star, ShoppingBag, TrendingUp } from 'lucide-react';

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

export default function Marketplace() {
const [activeCategory, setActiveCategory] = useState('all');

const filteredProducts = activeCategory === 'all'
? products
: products.filter(p => p.category === activeCategory);

const recommendedProducts = products.filter(p => p.aiRecommended);

return (
<div className="space-y-8">
{/* Header */}
<div>
<h2 className="text-lg font-semibold tracking-tight text-white mb-1">Marketplace</h2>
<p className="text-sm text-slate-500 font-light">Curated products picked for your journey</p>
</div>

{/* AI Recommended strip */}
<div className="backdrop-blur-md bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
<div className="flex items-center gap-2 mb-4">
<Sparkles className="w-4 h-4 text-emerald-400" />
<h3 className="text-sm font-semibold text-white">Recommended for You</h3>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{recommendedProducts.map(product => (
<div key={product.id} className="bg-white/[0.03] border border-emerald-500/20 rounded-xl overflow-hidden hover:bg-white/[0.06] transition-all cursor-pointer">
<div className="aspect-square overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={product.image} alt={product.name} className="w-full h-full object-cover" />
</div>
<div className="p-3">
<p className="text-xs font-medium text-slate-200 mb-1 line-clamp-1">{product.name}</p>
<p className="text-xs text-slate-500 font-light">${product.price}</p>
</div>
</div>
))}
</div>
</div>

{/* Category filters */}
<div className="flex gap-2 overflow-x-auto pb-2">
{categories.map(cat => (
<button
key={cat}
onClick={() => setActiveCategory(cat)}
className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
activeCategory === cat
? 'bg-emerald-500 text-white'
: 'bg-white/5 text-slate-400 border border-slate-700 hover:bg-white/10'
}`}
>
{cat.charAt(0).toUpperCase() + cat.slice(1)}
</button>
))}
</div>

{/* Product grid */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
{filteredProducts.map(product => (
<div
key={product.id}
className="backdrop-blur-md bg-white/[0.02] border border-slate-800/50 hover:border-emerald-500/30 rounded-xl overflow-hidden transition-all cursor-pointer group"
>
<div className="aspect-square bg-slate-900/50 relative overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={product.image}
alt={product.name}
className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>
{product.aiRecommended && (
<div className="absolute top-2 right-2 bg-emerald-500/90 backdrop-blur-sm rounded-full p-1.5">
<Sparkles className="w-3 h-3 text-white" />
</div>
)}
</div>
<div className="p-4">
<p className="text-xs text-slate-500 font-light mb-1">{product.brand}</p>
<h4 className="text-sm font-medium text-slate-200 mb-2 line-clamp-1">{product.name}</h4>
<div className="flex items-center gap-1 mb-3">
<Star className="w-3 h-3 text-amber-400 fill-amber-400" />
<span className="text-xs text-slate-400">{product.rating}</span>
<span className="text-xs text-slate-600">({product.reviews})</span>
</div>
<div className="flex items-center justify-between">
<span className="text-sm font-semibold text-white">${product.price}</span>
<button className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all">
<ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
</button>
</div>
</div>
</div>
))}
</div>

{/* Business CTA */}
<div className="backdrop-blur-md bg-white/[0.02] border border-slate-800/50 rounded-xl p-6 flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="p-2.5 bg-teal-500/10 rounded-lg">
<TrendingUp className="w-5 h-5 text-teal-400" />
</div>
<div>
<h3 className="text-sm font-semibold text-white">Sell on Potentia</h3>
<p className="text-xs text-slate-500 font-light">Reach engaged customers actively improving themselves</p>
</div>
</div>
<button className="bg-white/5 hover:bg-white/10 border border-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg text-xs whitespace-nowrap transition-all">
Become a Seller
</button>
</div>
</div>
);
}

