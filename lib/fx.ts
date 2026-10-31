'use client';

// lib/fx.ts — the live THB rate you set in the admin page. Loaded once and shared.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { THB_TO_MMK } from './payments';

let cached: number | null = null;
let loading: Promise<number> | null = null;

export async function getThbRate(): Promise<number> {
if (cached) return cached;
if (!loading) {
loading = (async () => {
try {
const { data } = await supabase.from('app_settings').select('value').eq('key', 'thb_rate').single();
const r = Number((data as { value?: unknown } | null)?.value);
cached = Number.isFinite(r) && r > 10 ? r : THB_TO_MMK;
} catch {
cached = THB_TO_MMK;
}
loading = null;
return cached;
})();
}
return loading;
}

/** Forget the saved rate (after the admin changes it). */
export function resetThbRate(r?: number) {
cached = r ?? null;
}

/** React hook: the current THB rate (starts with the last known value, updates when loaded). */
export function useThbRate() {
const [rate, setRate] = useState<number>(cached ?? THB_TO_MMK);
useEffect(() => {
let alive = true;
getThbRate().then(r => alive && setRate(r));
return () => {
alive = false;
};
}, []);
return rate;
}

