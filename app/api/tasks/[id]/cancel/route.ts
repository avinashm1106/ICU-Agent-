import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { cancelTask } from '@/lib/tasks/task-engine';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const updated = await cancelTask(id, u.id, body.reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
