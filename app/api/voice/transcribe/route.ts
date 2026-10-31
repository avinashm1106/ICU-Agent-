import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { getAIProvider } from '@/lib/ai/provider';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden: Staff cannot transcribe' }, { status: 403 });
  }

  try {
    const data = await req.formData();
    const file = data.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 413 });
    }

    const aiProvider = getAIProvider();
    const transcript = await aiProvider.transcribeAudio(file, file.type || 'audio/webm');

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Speech-to-text transcription failed',
      },
      { status: 500 }
    );
  }
}
