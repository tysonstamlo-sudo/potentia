// app/api/account/delete/route.ts — "Delete my account" (Google Play requires this).
// Removes the person's personal data and closes their login for good.
// Payment and order records are kept (anonymous) because they are financial records.

import { adminDb, ADMIN_USER_ID } from '../../../../lib/pushServer';
import { getUser } from '../../../../lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
const user = await getUser(req);
if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
if (user.id === ADMIN_USER_ID) return Response.json({ error: 'The admin account cannot be deleted here.' }, { status: 403 });

const db = adminDb();
const id = user.id;

try {
// profile picture files
const { data: files } = await db.storage.from('avatars').list(id);
if (files?.length) await db.storage.from('avatars').remove(files.map(f => `${id}/${f.name}`));

// personal data
await Promise.all([
db.from('scans').delete().eq('user_id', id),
db.from('habit_logs').delete().eq('user_id', id),
db.from('food_logs').delete().eq('user_id', id),
db.from('push_subscriptions').delete().eq('user_id', id),
db.from('trial_feedback').delete().eq('user_id', id),
db.from('friendships').delete().or(`requester_id.eq.${id},addressee_id.eq.${id}`),
db.from('products').update({ active: false }).eq('seller_id', id),
]);

// keep the row (payments point to it) but wipe everything personal
const { error: pErr } = await db
.from('profiles')
.update({
username: 'Deleted user',
email: null,
avatar_url: null,
gender: null,
show_on_looks_board: false,
nutrition: null,
onboarding: null,
is_premium: false,
subscription_expires_at: null,
})
.eq('id', id);
if (pErr) console.error('delete: profile wipe', pErr);

// close the login for good (soft delete keeps payment records valid)
const { error } = await db.auth.admin.deleteUser(id, true);
if (error) throw error;

return Response.json({ ok: true });
} catch (e) {
console.error('account delete failed', e);
return Response.json({ error: 'Could not delete the account. Please contact us.' }, { status: 500 });
}
}

