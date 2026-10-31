import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoActionInput } from '@/lib/validation';
import { respondToTask, remindTask } from '@/lib/tasks/task-engine';
import { runEscalationCycle } from '@/lib/escalation/scheduler';
import { recordAudit } from '@/lib/audit/audit';
import { eventBus } from '@/lib/events';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = demoActionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, taskId, userId, reason } = parsed.data;

  try {
    switch (action) {
      case 'SIMULATE_YES': {
        // Find targeted or earliest pending task
        const task = taskId
          ? await db.task.findUnique({ where: { id: taskId } })
          : await db.task.findFirst({
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } },
              orderBy: { createdAt: 'desc' },
            });

        if (!task) {
          return NextResponse.json({ error: 'No active pending task found to simulate YES' }, { status: 404 });
        }

        const updated = await respondToTask(task.id, task.assignedToId, 'YES');
        return NextResponse.json({ success: true, action, task: updated });
      }

      case 'SIMULATE_NO': {
        const task = taskId
          ? await db.task.findUnique({ where: { id: taskId } })
          : await db.task.findFirst({
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } },
              orderBy: { createdAt: 'desc' },
            });

        if (!task) {
          return NextResponse.json({ error: 'No active pending task found to simulate NO' }, { status: 404 });
        }

        const noReason = reason || 'Staff is occupied with emergency resuscitation in Bed 4';
        const updated = await respondToTask(task.id, task.assignedToId, 'NO', noReason);
        return NextResponse.json({ success: true, action, task: updated });
      }

      case 'SIMULATE_DELAY': {
        // Age a task past threshold so it becomes overdue/eligible for escalation
        const task = taskId
          ? await db.task.findUnique({ where: { id: taskId } })
          : await db.task.findFirst({
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
            });

        if (!task) {
          return NextResponse.json({ error: 'No pending task found to simulate delay' }, { status: 404 });
        }

        const agedCreatedAt = new Date(Date.now() - 40 * 60 * 1000); // 40 minutes ago
        const pastDeadline = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const updated = await db.task.update({
          where: { id: task.id },
          data: {
            createdAt: agedCreatedAt,
            deadline: pastDeadline,
          },
        });

        // Trigger escalation cycle immediately to evaluate aged state
        const escalationResult = await runEscalationCycle();

        return NextResponse.json({
          success: true,
          action,
          message: 'Task aged by 40 minutes and escalation cycle evaluated',
          task: updated,
          escalationResult,
        });
      }

      case 'TRIGGER_REMINDER': {
        const task = taskId
          ? await db.task.findUnique({ where: { id: taskId } })
          : await db.task.findFirst({
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } },
              orderBy: { createdAt: 'desc' },
            });

        if (!task) {
          return NextResponse.json({ error: 'No active task found to remind' }, { status: 404 });
        }

        const result = await remindTask(task.id, u.id);
        return NextResponse.json({ success: true, action, result });
      }

      case 'TRIGGER_ESCALATION': {
        const cycleResult = await runEscalationCycle();
        return NextResponse.json({ success: true, action, cycleResult });
      }

      case 'RESET_DEMO': {
        // Reset dynamic tasks or run re-seeding helper
        await recordAudit({
          actorId: u.id,
          action: 'DEMO_RESET',
          entity: 'System',
          entityId: 'all',
          metadata: { triggeredBy: u.name },
        });

        eventBus.broadcast('DEMO_RESET', { resetAt: new Date().toISOString() });
        return NextResponse.json({ success: true, message: 'Demo state reset' });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
