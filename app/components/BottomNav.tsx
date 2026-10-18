'use client';

import React from 'react';
import { useLang } from '../../lib/i18n';
import { LayoutGrid, ScanFace, LineChart, Trophy, Users, ShoppingBag } from 'lucide-react';

export type TabKey = 'dashboard' | 'scan' | 'progress' | 'rankings' | 'friends' | 'marketplace';

type BottomNavProps = {
activeTab: TabKey;
onChange: (tab: TabKey) => void;
};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
{ key: 'dashboard', label: 'Home', icon: LayoutGrid },
{ key: 'scan', label: 'Scan', icon: ScanFace },
{ key: 'progress', label: 'Progress', icon: LineChart },
{ key: 'rankings', label: 'Ranks', icon: Trophy },
{ key: 'friends', label: 'Friends', icon: Users },
{ key: 'marketplace', label: 'Shop', icon: ShoppingBag },
];

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
const { t, lang } = useLang();
return (
<nav
className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bottom-nav-safe md:hidden transition-colors"
style={{
borderTop: '1px solid rgb(var(--gold) / 0.12)',
background: 'rgb(var(--bg) / 0.88)',
}}
>
<div className="grid grid-cols-6">
{TABS.map(({ key, label, icon: Icon }) => {
const active = activeTab === key;
return (
<button
key={key}
onClick={() => onChange(key)}
className="flex flex-col items-center justify-center gap-1 py-2.5 relative"
>
<span
className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
style={{
background: active ? 'rgb(var(--gold) / 0.14)' : 'transparent',
boxShadow: active ? '0 0 10px rgb(var(--gold) / 0.25)' : 'none',
}}
>
<Icon
className="w-[17px] h-[17px] transition-colors"
strokeWidth={active ? 2.1 : 1.7}
style={{ color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }}
/>
</span>
<span
className={`${lang === 'my' ? 'text-[9px]' : 'text-[8px] tracking-wide uppercase'} transition-colors`}
style={{ color: active ? 'rgb(var(--gold))' : 'rgb(var(--muted))' }}
>
{t(label)}
</span>
</button>
);
})}
</div>
</nav>
);
}

