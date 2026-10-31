import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId');
  const allStaff = searchParams.get('all') === 'true';

  // Security isolation: STAFF can only ever see their own messages
  if (u.role === 'STAFF') {
    const messages = await db.whatsAppMessage.findMany({
      where: { userId: u.id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            bedNumber: true,
            completedAt: true,
            responseAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return NextResponse.json(messages);
  }

  // Admin or Consultant querying
  if (allStaff) {
    // Return messages for all staff grouped by staffId
    const staffMembers = await db.user.findMany({
      where: {
        role: 'STAFF',
        ...(u.role !== 'ADMIN' && u.icuId ? { icuId: u.icuId } : {}),
      },
      select: { id: true, name: true, email: true },
    });

    const messages = await db.whatsAppMessage.findMany({
      where: {
        userId: { in: staffMembers.map((s) => s.id) },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            bedNumber: true,
            completedAt: true,
            responseAt: true,
          },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ staffMembers, messages });
  }

  const effectiveUserId = targetUserId || u.id;
  const messages = await db.whatsAppMessage.findMany({
    where: { userId: effectiveUserId },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          bedNumber: true,
          completedAt: true,
          responseAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json(messages);
}
