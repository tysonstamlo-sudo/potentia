'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Check, X, Crown, ShieldAlert } from 'lucide-react';

// Replace this with your own Supabase user ID (Authentication → Users → copy UID)
const ADMIN_USER_ID = '0ae23fa9-66ba-446d-8f3d-a06d49ee8760';

type PremiumRequest = {
id: string;
user_id: string;
plan: string;
status: string;
created_at: string;
profiles: { username: string } | null;
};

const planDurationMonths: Record<string, number> = {
'1month': 1,
'6months': 6,
'1year': 12,
};

export default function AdminPage() {
const router = useRouter();
const [checking, setChecking] = useState(true);
const [isAdmin, setIsAdmin] = useState(false);
const [requests, setRequests] = useState<PremiumRequest[]>([]);
const [loading, setLoading] = useState(true);
const [processingId, setProcessingId] = useState<string | null>(null);

const loadRequests = useCallback(async () => {
const { data, error } = await supabase
.from('premium_requests')
.select('id, user_id, plan, status, created_at, profiles(username)')
.eq('status', 'pending')
.order('created_at', { ascending: true });

if (error) console.error('Failed to load requests:', error);
setRequests((data as unknown as PremiumRequest[]) ?? []);
setLoading(false);
}, []);

useEffect(() => {
const init = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
router.push('/login');
return;
}
if (session.user.id !== ADMIN_USER_ID) {
setChecking(false);
return;
}
setIsAdmin(true);
setChecking(false);
await loadRequests();
};
init();
}, [router, loadRequests]);

const approve = async (req: PremiumRequest) => {
setProcessingId(req.id);
try {
const months = planDurationMonths[req.plan] ?? 1;
const expiresAt = new Date();
expiresAt.setMonth(expiresAt.getMonth() + months);

await supabase
.from('profiles')
.update({
is_premium: true,
subscription_tier: req.plan,
subscription_expires_at: expiresAt.toISOString(),
})
.eq('id', req.user_id);

await supabase
.from('premium_requests')
.update({ status: 'approved' })
.eq('id', req.id);

await loadRequests();
} catch (err) {
console.error('Approve failed:', err);
} finally {
setProcessingId(null);
}
};

const reject = async (req: PremiumRequest) => {
setProcessingId(req.id);
try {
await supabase
.from('premium_requests')
.update({ status: 'rejected' })
.eq('id', req.id);
await loadRequests();
} catch (err) {
console.error('Reject failed:', err);
} finally {
setProcessingId(null);
}
};

if (checking) {
return (
<div className="min-h-screen bg-[#050505] flex items-center justify-center">
<span className="text-[#7A6E5D] text-sm font-body">Loading...</span>
</div>
);
}

if (!isAdmin) {
return (
<div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 font-body">
<ShieldAlert className="w-8 h-8 text-[#8B4A3D]" />
<p className="text-[#8B4A3D] text-sm">Not authorized.</p>
</div>
);
}

return (
<div className="min-h-screen bg-[#050505] text-[#C9A24B] font-body p-6 md:p-12">
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
.font-body { font-family: 'Inter', sans-serif; }
`}</style>
<div className="max-w-3xl mx-auto">
<div className="flex items-center gap-2 mb-10">
<Crown className="w-5 h-5 text-[#C9A24B]" />
<h1 className="font-display text-2xl text-[#C9A24B] font-light">Premium Requests</h1>
</div>

{loading ? (
<p className="text-sm text-[#7A6E5D]">Loading...</p>
) : requests.length === 0 ? (
<p className="text-sm text-[#7A6E5D]">No pending requests.</p>
) : (
<div className="space-y-3">
{requests.map(req => (
<div key={req.id} className="border border-[#7A6E5D]/20 rounded-sm p-5 flex items-center justify-between gap-4">
<div>
<p className="text-sm text-[#C9A24B] font-medium">{req.profiles?.username ?? 'Unknown user'}</p>
<p className="text-xs text-[#7A6E5D] mt-1">
Plan: {req.plan} · {new Date(req.created_at).toLocaleDateString()}
</p>
</div>
<div className="flex gap-2 flex-shrink-0">
<button
onClick={() => approve(req)}
disabled={processingId === req.id}
className="flex items-center gap-1.5 text-xs border border-[#C9A24B]/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/[0.08] text-[#C9A24B] disabled:opacity-50 rounded-sm px-3 py-2 transition-all"
>
<Check className="w-3.5 h-3.5" />
Approve
</button>
<button
onClick={() => reject(req)}
disabled={processingId === req.id}
className="flex items-center gap-1.5 text-xs border border-[#7A6E5D]/30 hover:border-[#7A6E5D]/60 text-[#7A6E5D] disabled:opacity-50 rounded-sm px-3 py-2 transition-all"
>
<X className="w-3.5 h-3.5" />
Reject
</button>
</div>
</div>
))}
</div>
)}
</div>
</div>
);
}

