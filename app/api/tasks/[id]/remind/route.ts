import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { remindTask } from '@/lib/tasks/task-engine';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await remindTask(id, u.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
