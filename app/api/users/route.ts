import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { recordAudit } from '@/lib/audit/audit';

export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await db.user.findMany({
    include: {
      icu: { select: { name: true } },
      hospital: { select: { name: true } },
      _count: { select: { assigned: true, created: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, icuId } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required user fields' }, { status: 400 });
  }

  const hospital = await db.hospital.findFirst();
  if (!hospital) {
    return NextResponse.json({ error: 'No hospital registered' }, { status: 500 });
  }

  try {
    const passwordHash = await hash(password, 10);
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        hospitalId: hospital.id,
        icuId: icuId || null,
        active: true,
      },
    });

    await recordAudit({
      actorId: u.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: { name, email, role },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, active, role } = body;

  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const data: any = {};
  if (typeof active === 'boolean') data.active = active;
  if (role) data.role = role;

  try {
    const updated = await db.user.update({
      where: { id },
      data,
    });

    await recordAudit({
      actorId: u.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      metadata: data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
