import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staff = await db.user.findMany({
      where: {
        role: 'STAFF',
        ...(u.role !== 'ADMIN' && u.icuId ? { icuId: u.icuId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        assigned: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      active: s.active,
      pendingCount: s.assigned.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length,
      completedCount: s.assigned.filter((t) => t.status === 'COMPLETED').length,
      blockedCount: s.assigned.filter((t) => t.status === 'BLOCKED').length,
    }));

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
