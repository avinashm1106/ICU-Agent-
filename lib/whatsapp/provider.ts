import { db } from '@/lib/db';
import { eventBus } from '@/lib/events';

export interface WhatsAppMessagePayload {
  userId: string;
  taskId?: string | null;
  text: string;
  direction: 'IN' | 'OUT';
  metadata?: any;
}

export interface TaskMessageParams {
  userId: string;
  taskId: string;
  taskTitle: string;
  bedNumber?: number | null;
  priority: string;
  assignedByName: string;
}

export interface ReminderMessageParams {
  userId: string;
  taskId: string;
  taskTitle: string;
  bedNumber?: number | null;
  level: number;
}

export interface EscalationMessageParams {
  consultantId: string;
  taskId: string;
  taskTitle: string;
  assignedToName: string;
  bedNumber?: number | null;
  elapsedMinutes: number;
}

export interface WhatsAppProvider {
  sendMessage(payload: WhatsAppMessagePayload, tx?: any): Promise<any>;
  sendTaskMessage(params: TaskMessageParams, tx?: any): Promise<any>;
  sendReminder(params: ReminderMessageParams, tx?: any): Promise<any>;
  sendEscalation(params: EscalationMessageParams, tx?: any): Promise<any>;
  getMessages(userId: string): Promise<any[]>;
  processResponse(taskId: string, userId: string, text: string, tx?: any): Promise<any>;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(payload: WhatsAppMessagePayload, tx?: any): Promise<any> {
    const client = tx || db;
    const msg = await client.whatsAppMessage.create({
      data: {
        userId: payload.userId,
        taskId: payload.taskId || null,
        text: payload.text,
        direction: payload.direction,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            bedNumber: true,
            priority: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    eventBus.broadcast('WHATSAPP_MESSAGE_SENT', {
      message: msg,
      userId: payload.userId,
      taskId: payload.taskId,
    }, msg.id);

    return msg;
  }

  async sendTaskMessage(params: TaskMessageParams, tx?: any): Promise<any> {
    const bedInfo = params.bedNumber ? ` · Bed ${params.bedNumber}` : '';
    const text = `🚨 *New ICU Task Dispatched*\n*Task:* ${params.taskTitle}${bedInfo}\n*Priority:* ${params.priority}\n*Assigned By:* ${params.assignedByName}\n\nPlease review immediately.\n👉 Reply *YES* when completed or *NO* if unable.`;
    return this.sendMessage({
      userId: params.userId,
      taskId: params.taskId,
      text,
      direction: 'OUT',
    }, tx);
  }

  async sendReminder(params: ReminderMessageParams, tx?: any): Promise<any> {
    const bedInfo = params.bedNumber ? ` (Bed ${params.bedNumber})` : '';
    const text = `⏰ *Reminder #${params.level}*\nYour ICU task is still pending: *${params.taskTitle}*${bedInfo}.\n\nPlease update status promptly: Reply *YES* once completed or *NO* if blocked.`;
    return this.sendMessage({
      userId: params.userId,
      taskId: params.taskId,
      text,
      direction: 'OUT',
    }, tx);
  }

  async sendEscalation(params: EscalationMessageParams, tx?: any): Promise<any> {
    const bedInfo = params.bedNumber ? ` (Bed ${params.bedNumber})` : '';
    const text = `⚠️ *ESCALATION ALERT*\nTask *${params.taskTitle}*${bedInfo} assigned to *${params.assignedToName}* has received no response after ${params.elapsedMinutes} minutes.\nConsultant intervention required.`;
    return this.sendMessage({
      userId: params.consultantId,
      taskId: params.taskId,
      text,
      direction: 'OUT',
    }, tx);
  }

  async getMessages(userId: string): Promise<any[]> {
    return db.whatsAppMessage.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            bedNumber: true,
            priority: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async processResponse(taskId: string, userId: string, text: string, tx?: any): Promise<any> {
    return this.sendMessage({
      userId,
      taskId,
      text,
      direction: 'IN',
    }, tx);
  }
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  // Production Meta WhatsApp Business Cloud API stub
  async sendMessage(_payload: WhatsAppMessagePayload): Promise<any> {
    throw new Error('Meta WhatsApp Business Cloud API not configured yet. Set WHATSAPP_PROVIDER=mock.');
  }
  async sendTaskMessage(_params: TaskMessageParams): Promise<any> {
    throw new Error('Meta WhatsApp Business Cloud API not configured yet.');
  }
  async sendReminder(_params: ReminderMessageParams): Promise<any> {
    throw new Error('Meta WhatsApp Business Cloud API not configured yet.');
  }
  async sendEscalation(_params: EscalationMessageParams): Promise<any> {
    throw new Error('Meta WhatsApp Business Cloud API not configured yet.');
  }
  async getMessages(_userId: string): Promise<any[]> {
    return [];
  }
  async processResponse(_taskId: string, _userId: string, _text: string): Promise<any> {
    throw new Error('Meta WhatsApp Business Cloud API not configured yet.');
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';
  if (provider === 'meta') {
    return new MetaWhatsAppProvider();
  }
  return new MockWhatsAppProvider();
}
