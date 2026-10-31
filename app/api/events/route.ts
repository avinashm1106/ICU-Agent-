import { NextRequest } from 'next/server';
import { eventBus, AppEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial connection ping
  const initialPayload = `data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`;
  await writer.write(encoder.encode(initialPayload));

  const listener = async (event: AppEvent) => {
    try {
      const payload = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      // client disconnected
      eventBus.off('app_event', listener);
    }
  };

  eventBus.on('app_event', listener);

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(heartbeat);
      eventBus.off('app_event', listener);
    }
  }, 15000);

  req.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    eventBus.off('app_event', listener);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
