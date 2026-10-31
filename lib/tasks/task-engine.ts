import { TaskStatus, Priority, TaskSource } from '@prisma/client';
import { db } from '@/lib/db';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider';
import { recordAudit } from '@/lib/audit/audit';
import { eventBus } from '@/lib/events';

export const transitions: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ['IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED', 'OVERDUE'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'OVERDUE'],
  OVERDUE: ['COMPLETED', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['PENDING', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedToId: string;
  createdById: string;
  icuId: string;
  bedNumber?: number | null;
  priority?: Priority;
  deadline?: Date | null;
  source?: TaskSource;
  voiceSessionId?: string | null;
  patientId?: string | null;
}

export async function createTask(input: CreateTaskInput, force = false) {
  // Check for duplicate task within 2 minutes
  if (!force) {
    const twoMinutesAgo = new Date(Date.now() - 120000);
    const existing = await db.task.findFirst({
      where: {
        createdById: input.createdById,
        assignedToId: input.assignedToId,
        title: input.title,
        bedNumber: input.bedNumber || null,
        createdAt: { gte: twoMinutesAgo },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
    });

    if (existing) {
      throw new Error(`POSSIBLE_DUPLICATE: Identical task was recently dispatched (ID: ${existing.id}).`);
    }
  }

  const result = await db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: input.title,
        description: input.description || '',
        assignedToId: input.assignedToId,
        createdById: input.createdById,
        icuId: input.icuId,
        bedNumber: input.bedNumber || null,
        priority: input.priority || 'MEDIUM',
        deadline: input.deadline || null,
        source: input.source || 'MANUAL',
        voiceSessionId: input.voiceSessionId || null,
        patientId: input.patientId || null,
        status: 'PENDING',
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Record initial assignment
    await tx.taskAssignment.create({
      data: {
        taskId: task.id,
        userId: input.assignedToId,
      },
    });

    // Dispatch WhatsApp notification
    const whatsapp = getWhatsAppProvider();
    await whatsapp.sendTaskMessage(
      {
        userId: input.assignedToId,
        taskId: task.id,
        taskTitle: task.title,
        bedNumber: task.bedNumber,
        priority: task.priority,
        assignedByName: task.createdBy.name,
      },
      tx
    );

    // Audit log
    await recordAudit(
      {
        actorId: input.createdById,
        action: 'TASK_CREATED',
        entity: 'Task',
        entityId: task.id,
        metadata: {
          title: task.title,
          assignedTo: task.assignedTo.name,
          bedNumber: task.bedNumber,
          priority: task.priority,
          source: task.source,
        },
      },
      tx
    );

    return task;
  });

  eventBus.broadcast('TASK_CREATED', { task: result }, result.id);
  eventBus.broadcast('TASK_ASSIGNED', { task: result, userId: input.assignedToId }, result.id);

  return result;
}

export async function respondToTask(
  taskId: string,
  userId: string,
  answer: 'YES' | 'NO',
  reason?: string
) {
  const result = await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Verify authorized assignee
    if (task.assignedToId !== userId) {
      throw new Error(`Unauthorized: This task is assigned to ${task.assignedTo.name}, not you.`);
    }

    const nextStatus: TaskStatus = answer === 'YES' ? 'COMPLETED' : 'BLOCKED';

    if (!canTransition(task.status, nextStatus)) {
      throw new Error(
        `Invalid status transition: cannot transition task from ${task.status} to ${nextStatus}`
      );
    }

    const now = new Date();
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        responseAt: now,
        ...(answer === 'YES' ? { completedAt: now } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Record response
    await tx.taskResponse.create({
      data: {
        taskId,
        userId,
        answer: reason ? `${answer}: ${reason}` : answer,
      },
    });

    // Send WhatsApp messages
    const whatsapp = getWhatsAppProvider();
    await whatsapp.processResponse(taskId, userId, answer === 'YES' ? 'YES — Completed' : `NO — Unable${reason ? ` (${reason})` : ''}`, tx);

    const confirmationText =
      answer === 'YES'
        ? `✅ Task marked as *COMPLETED* at ${now.toLocaleTimeString()}.\nThank you for confirming.`
        : `⚠️ Task marked as *BLOCKED*.\nConsultant ${task.createdBy.name} has been alerted for reassignment.`;

    await whatsapp.sendMessage(
      {
        userId,
        taskId,
        text: confirmationText,
        direction: 'OUT',
      },
      tx
    );

    // If blocked, alert consultant
    if (answer === 'NO') {
      await tx.notification.create({
        data: {
          userId: task.createdById,
          text: `⚠️ Staff unable to complete task: "${task.title}" (Assigned to ${task.assignedTo.name})${reason ? ` - Reason: ${reason}` : ''}`,
        },
      });
    }

    // Record audit log
    await recordAudit(
      {
        actorId: userId,
        action: answer === 'YES' ? 'TASK_COMPLETED' : 'TASK_BLOCKED',
        entity: 'Task',
        entityId: taskId,
        metadata: {
          answer,
          reason,
          previousStatus: task.status,
          newStatus: nextStatus,
          timestamp: now.toISOString(),
        },
      },
      tx
    );

    return updatedTask;
  });

  const eventType = answer === 'YES' ? 'TASK_COMPLETED' : 'TASK_BLOCKED';
  eventBus.broadcast(eventType, { task: result, answer, reason }, result.id);
  eventBus.broadcast('STAFF_RESPONSE', { task: result, answer, reason }, result.id);

  return result;
}

export async function remindTask(taskId: string, actorId: string) {
  const result = await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        reminders: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (['COMPLETED', 'CANCELLED'].includes(task.status)) {
      throw new Error(`Cannot remind a ${task.status.toLowerCase()} task`);
    }

    const nextLevel = task.reminders.length + 1;

    await tx.reminder.create({
      data: {
        taskId,
        level: nextLevel,
      },
    });

    const whatsapp = getWhatsAppProvider();
    await whatsapp.sendReminder(
      {
        userId: task.assignedToId,
        taskId: task.id,
        taskTitle: task.title,
        bedNumber: task.bedNumber,
        level: nextLevel,
      },
      tx
    );

    await recordAudit(
      {
        actorId,
        action: 'REMINDER_SENT',
        entity: 'Task',
        entityId: taskId,
        metadata: {
          level: nextLevel,
          assignedTo: task.assignedTo.name,
        },
      },
      tx
    );

    return { task, level: nextLevel };
  });

  eventBus.broadcast('REMINDER_SENT', { task: result.task, level: result.level }, taskId);
  return result;
}

export async function reassignTask(
  taskId: string,
  newUserId: string,
  actorId: string,
  reason?: string
) {
  const result = await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!['BLOCKED', 'PENDING', 'OVERDUE', 'IN_PROGRESS'].includes(task.status)) {
      throw new Error(`Cannot reassign task in state ${task.status}`);
    }

    const newStaff = await tx.user.findUnique({
      where: { id: newUserId },
    });

    if (!newStaff || newStaff.role !== 'STAFF' || !newStaff.active) {
      throw new Error('Target staff member is invalid or inactive');
    }

    const oldStaffName = task.assignedTo.name;

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        assignedToId: newUserId,
        status: 'PENDING',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Record new assignment in history
    await tx.taskAssignment.create({
      data: {
        taskId,
        userId: newUserId,
      },
    });

    // Send WhatsApp to new staff
    const whatsapp = getWhatsAppProvider();
    await whatsapp.sendMessage(
      {
        userId: newUserId,
        taskId,
        text: `🔄 *Reassigned ICU Task*\n*Task:* ${task.title}${task.bedNumber ? ` · Bed ${task.bedNumber}` : ''}\n*Priority:* ${task.priority}\n*Originally assigned to:* ${oldStaffName}\n${reason ? `*Reason for reassignment:* ${reason}\n` : ''}\nPlease review and respond:\n👉 Reply *YES* when completed or *NO* if unable.`,
        direction: 'OUT',
      },
      tx
    );

    // Notify previous assignee that task was reassigned
    await whatsapp.sendMessage(
      {
        userId: task.assignedToId,
        taskId,
        text: `ℹ️ Notice: Task *"${task.title}"* has been reassigned to *${newStaff.name}*. You are no longer responsible for this task.`,
        direction: 'OUT',
      },
      tx
    );

    // Audit log
    await recordAudit(
      {
        actorId,
        action: 'TASK_REASSIGNED',
        entity: 'Task',
        entityId: taskId,
        metadata: {
          fromUserId: task.assignedToId,
          fromUserName: oldStaffName,
          toUserId: newUserId,
          toUserName: newStaff.name,
          reason,
        },
      },
      tx
    );

    return updated;
  });

  eventBus.broadcast('TASK_REASSIGNED', { task: result, newUserId }, taskId);
  return result;
}

export async function cancelTask(taskId: string, actorId: string, reason?: string) {
  const result = await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'COMPLETED') {
      throw new Error('Cannot cancel an already completed task');
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const whatsapp = getWhatsAppProvider();
    await whatsapp.sendMessage(
      {
        userId: task.assignedToId,
        taskId,
        text: `🚫 *Task Cancelled*\nTask *"${task.title}"* has been cancelled by the consultant.${reason ? ` Reason: ${reason}` : ''}`,
        direction: 'OUT',
      },
      tx
    );

    await recordAudit(
      {
        actorId,
        action: 'TASK_CANCELLED',
        entity: 'Task',
        entityId: taskId,
        metadata: { reason },
      },
      tx
    );

    return updated;
  });

  eventBus.broadcast('TASK_CANCELLED', { task: result }, taskId);
  return result;
}
