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
<div className="space-y-12 font-body">
{/* Header */}
<div className="pb-6 border-b border-[#7A6E5D]/20">
<span className="text-[10px] tracking-[0.35em] text-[#D4AF6E] uppercase block mb-2">Provisions</span>
<h2 className="font-display text-2xl text-[#D4AF6E] font-light">Marketplace</h2>
</div>

{/* AI Recommended strip */}
<div>
<div className="flex items-center gap-2 mb-6">
<Sparkles className="w-3.5 h-3.5 text-[#D4AF6E]" />
<span className="text-[10px] tracking-[0.2em] text-[#D4AF6E] uppercase">Recommended for You</span>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
{recommendedProducts.map(product => (
<div key={product.id} className="border border-[#7A6E5D]/20 hover:border-[#D4AF6E]/40 transition-all cursor-pointer">
<div className="aspect-square overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={product.image} alt={product.name} className="w-full h-full object-cover" />
</div>
<div className="p-3">
<p className="text-xs text-[#D4AF6E] mb-1 line-clamp-1">{product.name}</p>
<p className="text-[11px] text-[#7A6E5D]">${product.price}</p>
</div>
</div>
))}
</div>
</div>

{/* Category filters */}
<div className="flex gap-6 overflow-x-auto border-b border-[#7A6E5D]/20 pb-4">
{categories.map(cat => (
<button
key={cat}
onClick={() => setActiveCategory(cat)}
className={`text-[11px] tracking-[0.1em] uppercase whitespace-nowrap transition-all pb-1 relative ${
activeCategory === cat ? 'text-[#D4AF6E]' : 'text-[#7A6E5D] hover:text-[#B0A48F]'
}`}
>
{cat}
{activeCategory === cat && (
<div className="absolute -bottom-4 left-0 right-0 h-px bg-[#D4AF6E]" />
)}
</button>
))}
</div>

{/* Product grid */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
{filteredProducts.map(product => (
<div
key={product.id}
className="border border-[#7A6E5D]/20 hover:border-[#D4AF6E]/40 transition-all cursor-pointer group"
>
<div className="aspect-square bg-[#12100C] relative overflow-hidden">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={product.image}
alt={product.name}
className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>
{product.aiRecommended && (
<div className="absolute top-2 right-2 bg-[#0A0908]/80 backdrop-blur-sm border border-[#D4AF6E]/40 rounded-full p-1.5">
<Sparkles className="w-3 h-3 text-[#D4AF6E]" />
</div>
)}
</div>
<div className="p-4">
<p className="text-[11px] text-[#7A6E5D] mb-1">{product.brand}</p>
<h4 className="text-sm text-[#D4AF6E] mb-2 line-clamp-1">{product.name}</h4>
<div className="flex items-center gap-1 mb-3">
<Star className="w-3 h-3 text-[#D4AF6E] fill-[#D4AF6E]" />
<span className="text-xs text-[#B0A48F]">{product.rating}</span>
<span className="text-xs text-[#7A6E5D]">({product.reviews})</span>
</div>
<div className="flex items-center justify-between">
<span className="font-display text-sm text-[#D4AF6E]">${product.price}</span>
<button className="p-2 border border-[#7A6E5D]/30 hover:border-[#D4AF6E]/50 rounded-sm transition-all">
<ShoppingBag className="w-3.5 h-3.5 text-[#D4AF6E]" />
</button>
</div>
</div>
</div>
))}
</div>

{/* Business CTA */}
<div className="border-t border-[#7A6E5D]/20 pt-8 flex items-center justify-between gap-4">
<div className="flex items-center gap-3">
<TrendingUp className="w-4 h-4 text-[#D4AF6E]" />
<div>
<h3 className="text-sm text-[#D4AF6E]">Sell on Potentia</h3>
<p className="text-[11px] text-[#7A6E5D]">Reach engaged customers actively improving themselves</p>
</div>
</div>
<button className="border border-[#7A6E5D]/30 hover:border-[#D4AF6E]/50 text-[#B0A48F] hover:text-[#D4AF6E] font-medium py-2 px-4 rounded-sm text-xs whitespace-nowrap transition-all">
Become a Seller
</button>
</div>
</div>
);
}

