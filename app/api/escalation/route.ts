import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { escalationConfigInput } from '@/lib/validation';
import { recordAudit } from '@/lib/audit/audit';

export async function GET() {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const icuId = u.icuId || (await db.iCU.findFirst())?.id;
  if (!icuId) {
    return NextResponse.json({ error: 'No ICU found' }, { status: 404 });
  }

  let rule = await db.escalationRule.findUnique({
    where: { icuId },
  });

  if (!rule) {
    rule = await db.escalationRule.create({
      data: {
        icuId,
        firstSeconds: 900,
        secondSeconds: 1800,
        escalateSeconds: 2700,
      },
    });
  }

  return NextResponse.json(rule);
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = escalationConfigInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const icuId = u.icuId || (await db.iCU.findFirst())?.id;
  if (!icuId) {
    return NextResponse.json({ error: 'No ICU found' }, { status: 404 });
  }

  const updated = await db.escalationRule.upsert({
    where: { icuId },
    create: {
      icuId,
      firstSeconds: parsed.data.firstSeconds,
      secondSeconds: parsed.data.secondSeconds,
      escalateSeconds: parsed.data.escalateSeconds,
    },
    update: {
      firstSeconds: parsed.data.firstSeconds,
      secondSeconds: parsed.data.secondSeconds,
      escalateSeconds: parsed.data.escalateSeconds,
    },
  });

  await recordAudit({
    actorId: u.id,
    action: 'ESCALATION_RULES_UPDATED',
    entity: 'EscalationRule',
    entityId: updated.id,
    metadata: parsed.data,
  });

  return NextResponse.json(updated);
}
