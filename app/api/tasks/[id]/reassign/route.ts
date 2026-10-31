import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { reassignTask } from '@/lib/tasks/task-engine';
import { reassignInput } from '@/lib/validation';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = reassignInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await reassignTask(id, parsed.data.userId, u.id, parsed.data.reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
