import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { respondToTask } from '@/lib/tasks/task-engine';
import { respondInput } from '@/lib/validation';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { taskId, answer, reason, userId } = body;

  const parsed = respondInput.safeParse({ answer, reason });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  // Determine authorized respondent
  let respondentId = u.id;
  if (u.role !== 'STAFF' && userId) {
    // Consultant/Admin acting in simulator mode
    respondentId = userId;
  }

  try {
    const updated = await respondToTask(taskId, respondentId, parsed.data.answer, parsed.data.reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
