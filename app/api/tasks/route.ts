import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { taskInput } from '@/lib/validation';
import { createTask } from '@/lib/tasks/task-engine';

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const staffId = searchParams.get('staffId');
  const priority = searchParams.get('priority');

  const where: any = {};

  if (u.role === 'STAFF') {
    where.assignedToId = u.id;
  } else if (u.role === 'CONSULTANT') {
    where.icuId = u.icuId || '';
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (staffId) {
    where.assignedToId = staffId;
  }

  if (priority) {
    where.priority = priority;
  }

  try {
    const tasks = await db.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        patient: { select: { id: true, name: true, bedNumber: true } },
        reminders: { orderBy: { level: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden: Staff cannot dispatch tasks' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = taskInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const v = parsed.data;
  const assignee = await db.user.findUnique({
    where: { id: v.assignedToId },
  });

  if (!assignee || assignee.role !== 'STAFF' || !assignee.active) {
    return NextResponse.json({ error: 'Invalid or inactive staff member' }, { status: 400 });
  }

  if (u.role !== 'ADMIN' && assignee.icuId !== u.icuId) {
    return NextResponse.json({ error: 'Staff member is not in your ICU' }, { status: 403 });
  }

  const force = new URL(req.url).searchParams.get('force') === 'true';

  try {
    const task = await createTask(
      {
        title: v.title,
        description: v.description,
        assignedToId: v.assignedToId,
        createdById: u.id,
        icuId: assignee.icuId || u.icuId || '',
        bedNumber: v.bedNumber,
        priority: v.priority as any,
        deadline: v.deadline ? new Date(v.deadline) : null,
        source: v.source as any,
        voiceSessionId: v.voiceSessionId,
      },
      force
    );

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error.message.startsWith('POSSIBLE_DUPLICATE:')) {
      return NextResponse.json(
        {
          error: error.message,
          possibleDuplicate: true,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
