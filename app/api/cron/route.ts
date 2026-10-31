import { NextResponse } from 'next/server';
import { runEscalationCycle } from '@/lib/escalation/scheduler';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'demo-cron-secret';
  const isDemo = process.env.DEMO_MODE === 'true';

  if (!isDemo && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runEscalationCycle();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Allow simple polling or cron triggers
  try {
    const result = await runEscalationCycle();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
