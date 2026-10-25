// app/api/push/broadcast/route.ts — the admin sends a notification to everyone.

import { adminDb, sendTo, ADMIN_USER_ID, type Sub } from '../../../../lib/pushServer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return new Response('Unauthorized', { status: 401 });

  const db = adminDb();
  const { data: who } = await db.auth.getUser(token);
  if (!who?.user || who.user.id !== ADMIN_USER_ID) return new Response('Forbidden', { status: 403 });

  const { title, body } = (await req.json()) as { title?: string; body?: string };
  if (!title || !body) return Response.json({ error: 'Title and message are required' }, { status: 400 });

  const { data: subs, error } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const sub of (subs ?? []) as Sub[]) {
    if (await sendTo(sub, { title: title.slice(0, 80), body: body.slice(0, 300), url: '/' })) sent++;
  }
  return Response.json({ sent, total: subs?.length ?? 0 });
}