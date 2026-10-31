import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/audit/audit';
import { eventBus } from '@/lib/events';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: {
          task: { select: { title: true } },
        },
        orderBy: { assignedAt: 'asc' },
      },
      responses: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      reminders: { orderBy: { level: 'asc' } },
      messages: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (u.role === 'STAFF' && task.assignedToId !== u.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: any = {};
  if (body.title) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.priority) data.priority = body.priority;
  if (body.bedNumber !== undefined) data.bedNumber = body.bedNumber ? Number(body.bedNumber) : null;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;

  try {
    const updated = await db.task.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await recordAudit({
      actorId: u.id,
      action: 'TASK_UPDATED',
      entity: 'Task',
      entityId: id,
      metadata: data,
    });

    eventBus.broadcast('TASK_CREATED', { task: updated }, id);

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
