import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notifications = await db.notification.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json().catch(() => ({}));
  try {
    if (id) {
      await db.notification.update({
        where: { id, userId: u.id },
        data: { read: true },
      });
    } else {
      await db.notification.updateMany({
        where: { userId: u.id, read: false },
        data: { read: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
