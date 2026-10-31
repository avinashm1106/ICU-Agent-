import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, text, taskId } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  }

  const targetUserId = userId || u.id;
  const whatsapp = getWhatsAppProvider();

  try {
    const msg = await whatsapp.sendMessage({
      userId: targetUserId,
      taskId: taskId || null,
      text,
      direction: u.role === 'STAFF' ? 'IN' : 'OUT',
    });

    return NextResponse.json(msg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
