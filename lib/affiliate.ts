'use client';

// lib/affiliate.ts — affiliate codes and links (…/?aff=CODE).
// The code is saved on the phone when someone opens an affiliate's link, and linked to
// their account after they log in. Once linked, every Premium payment of theirs counts.

import { supabase } from './supabase';

const KEY = 'ptn_aff';

export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

/** Save ?aff=CODE from the link so it survives the login / sign-up screens. */
export function rememberAffiliate() {
try {
const code = new URLSearchParams(window.location.search).get('aff');
if (code && cleanCode(code).length >= 3) localStorage.setItem(KEY, cleanCode(code));
} catch {
/* ignore */
}
}

export function savedAffiliate(): string {
try {
return localStorage.getItem(KEY) ?? '';
} catch {
return '';
}
}

/** Link this account to the affiliate. 'ok' | 'already' | 'invalid' | 'own' | 'error' */
export async function applyAffiliateCode(code: string): Promise<string> {
const c = cleanCode(code);
if (c.length < 3) return 'invalid';
const { data, error } = await supabase.rpc('apply_affiliate_code', { p_code: c });
if (error) return 'error';
const res = String(data);
if (res !== 'error') {
try {
localStorage.removeItem(KEY);
} catch {
/* ignore */
}
}
return res;
}

/** After login: link the saved code, if any (silent). */
export async function applySavedAffiliate() {
const c = savedAffiliate();
if (c) await applyAffiliateCode(c);
}

/** The affiliate's name for a code, or null if the code doesn't exist. */
export async function checkAffiliateCode(code: string): Promise<string | null> {
const c = cleanCode(code);
if (c.length < 3) return null;
const { data } = await supabase.rpc('check_affiliate_code', { p_code: c });
return typeof data === 'string' && data ? data : null;
}

export type AffiliateNumbers = {
id: string;
code: string;
name: string;
contact: string | null;
user_id: string | null;
rate: number;
active: boolean;
created_at: string;
buyers: number;
sales: number;
sales_mmk: number;
month_sales_mmk: number;
earned_mmk: number;
paid_mmk: number;
owed_mmk: number;
};

export const affiliateLink = (code: string) =>
`${typeof window !== 'undefined' ? window.location.origin : 'https://potentia-sigma.vercel.app'}/?aff=${code}`;

