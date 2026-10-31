import { db } from '@/lib/db';
import { eventBus } from '@/lib/events';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: any;
}

export async function recordAudit(params: CreateAuditLogParams, tx?: any) {
  const client = tx || db;
  const log = await client.auditLog.create({
    data: {
      actorId: params.actorId || null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata != null ? JSON.stringify(params.metadata) : null,
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  eventBus.broadcast('NOTIFICATION_CREATED', {
    auditLog: log,
  }, log.id);

  return log;
}
