import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAIProvider } from '@/lib/ai/provider';
import { recordAudit } from '@/lib/audit/audit';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden: Staff cannot extract tasks' }, { status: 403 });
  }

  const { transcript } = await req.json();
  if (typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'Valid spoken transcript is required' }, { status: 400 });
  }

  try {
    const staff = await db.user.findMany({
      where: {
        role: 'STAFF',
        active: true,
        ...(u.role !== 'ADMIN' && u.icuId ? { icuId: u.icuId } : {}),
      },
      select: { id: true, name: true },
    });

    const aiProvider = getAIProvider();
    const result = await aiProvider.extractTasks(transcript, staff);

    // Persist extraction and voice session for history & audit trail
    const session = await db.voiceSession.create({
      data: {
        consultantId: u.id,
        transcript,
        extraction: JSON.stringify(result),
      },
    });

    await db.aIExtraction.create({
      data: {
        transcript,
        result: JSON.stringify(result),
      },
    });

    await recordAudit({
      actorId: u.id,
      action: 'AI_EXTRACTION_GENERATED',
      entity: 'VoiceSession',
      entityId: session.id,
      metadata: {
        taskCount: result.tasks.length,
        uncertainCount: result.uncertainItems.length,
      },
    });

    return NextResponse.json({
      ...result,
      voiceSessionId: session.id,
    });
  } catch (error: any) {
    console.error('Task extraction error:', error);
    return NextResponse.json(
      {
        error: error.message || 'AI task extraction failed',
      },
      { status: 500 }
    );
  }
}
