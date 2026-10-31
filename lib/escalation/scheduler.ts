import { db } from '@/lib/db';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider';
import { recordAudit } from '@/lib/audit/audit';
import { eventBus } from '@/lib/events';

export interface EscalationRunResult {
  overdueTasks: number;
  remindersSent: number;
  escalationsTriggered: number;
}

export async function runEscalationCycle(): Promise<EscalationRunResult> {
  let overdueTasks = 0;
  let remindersSent = 0;
  let escalationsTriggered = 0;

  const activeTasks = await db.task.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
    },
    include: {
      icu: {
        include: {
          escalation: true,
        },
      },
      reminders: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const now = new Date();
  const whatsapp = getWhatsAppProvider();

  for (const task of activeTasks) {
    // 1. Check for OVERDUE status
    if (task.deadline && task.deadline < now && task.status !== 'OVERDUE') {
      await db.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: task.id },
          data: { status: 'OVERDUE' },
        });

        await tx.notification.create({
          data: {
            userId: task.createdById,
            text: `⚠️ Overdue task: "${task.title}" (Assigned to ${task.assignedTo.name}, Bed: ${task.bedNumber || 'N/A'})`,
          },
        });

        await recordAudit(
          {
            action: 'TASK_OVERDUE',
            entity: 'Task',
            entityId: task.id,
            metadata: {
              deadline: task.deadline,
              assignedTo: task.assignedTo.name,
            },
          },
          tx
        );
      });

      overdueTasks++;
      eventBus.broadcast('TASK_OVERDUE', { task }, task.id);
    }

    // 2. Check escalation timing
    const ageSeconds = Math.floor((now.getTime() - task.createdAt.getTime()) / 1000);
    const rule = task.icu.escalation;

    // Default or custom thresholds in seconds
    const firstSeconds = rule?.firstSeconds ?? 900;     // default 15 min
    const secondSeconds = rule?.secondSeconds ?? 1800;   // default 30 min
    const escalateSeconds = rule?.escalateSeconds ?? 2700; // default 45 min

    const thresholds = [
      { level: 1, seconds: firstSeconds },
      { level: 2, seconds: secondSeconds },
      { level: 3, seconds: escalateSeconds },
    ];

    for (const t of thresholds) {
      if (ageSeconds >= t.seconds && !task.reminders.some((r) => r.level === t.level)) {
        await db.$transaction(async (tx) => {
          await tx.reminder.create({
            data: {
              taskId: task.id,
              level: t.level,
            },
          });

          if (t.level < 3) {
            // Level 1 or 2: reminder to staff
            await whatsapp.sendReminder(
              {
                userId: task.assignedToId,
                taskId: task.id,
                taskTitle: task.title,
                bedNumber: task.bedNumber,
                level: t.level,
              },
              tx
            );

            await recordAudit(
              {
                action: 'REMINDER_SENT',
                entity: 'Task',
                entityId: task.id,
                metadata: {
                  level: t.level,
                  assignedTo: task.assignedTo.name,
                  ageSeconds,
                },
              },
              tx
            );
            remindersSent++;
            eventBus.broadcast('REMINDER_SENT', { task, level: t.level }, task.id);
          } else {
            // Level 3: escalate to consultant
            const elapsedMinutes = Math.floor(ageSeconds / 60);
            await whatsapp.sendEscalation(
              {
                consultantId: task.createdById,
                taskId: task.id,
                taskTitle: task.title,
                assignedToName: task.assignedTo.name,
                bedNumber: task.bedNumber,
                elapsedMinutes,
              },
              tx
            );

            await tx.notification.create({
              data: {
                userId: task.createdById,
                text: `🚨 ESCALATION: No staff response for "${task.title}" (${task.assignedTo.name}) after ${elapsedMinutes} minutes!`,
              },
            });

            await recordAudit(
              {
                action: 'ESCALATION_TRIGGERED',
                entity: 'Task',
                entityId: task.id,
                metadata: {
                  elapsedMinutes,
                  assignedTo: task.assignedTo.name,
                },
              },
              tx
            );
            escalationsTriggered++;
            eventBus.broadcast('ESCALATION_TRIGGERED', { task, elapsedMinutes }, task.id);
          }
        });
      }
    }
  }

  return { overdueTasks, remindersSent, escalationsTriggered };
}
