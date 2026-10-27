// lib/notify.ts — tell the server something happened so it can ping the right phone.
// Fire-and-forget: if it fails, nothing breaks.

import { supabase } from './supabase';

export type AlertEvent = 'premium_request' | 'order_placed' | 'order_paid' | 'order_shipped' | 'seller_approved';

export async function notify(event: AlertEvent, id: string) {
try {
const {
data: { session },
} = await supabase.auth.getSession();
if (!session) return;
await fetch('/api/push/alert', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
body: JSON.stringify({ event, id }),
});
} catch {
/* not critical */
}
}

