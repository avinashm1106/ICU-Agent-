import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { respondToTask } from '@/lib/tasks/task-engine';
import { respondInput } from '@/lib/validation';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = respondInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { answer, reason } = parsed.data;

  try {
    const updated = await respondToTask(id, u.id, answer, reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
