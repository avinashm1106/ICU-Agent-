import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const entity = searchParams.get('entity');
  const actorId = searchParams.get('actorId');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const where: any = {};
  if (action && action !== 'ALL') where.action = action;
  if (entity && entity !== 'ALL') where.entity = entity;
  if (actorId && actorId !== 'ALL') where.actorId = actorId;

  try {
    const logs = await db.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
