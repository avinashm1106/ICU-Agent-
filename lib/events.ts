// Real-time Event System for ICU Command Center
import { EventEmitter } from 'events';

export type EventType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_BLOCKED'
  | 'TASK_OVERDUE'
  | 'TASK_CANCELLED'
  | 'TASK_REASSIGNED'
  | 'REMINDER_SENT'
  | 'ESCALATION_TRIGGERED'
  | 'STAFF_RESPONSE'
  | 'WHATSAPP_MESSAGE_SENT'
  | 'NOTIFICATION_CREATED'
  | 'DEMO_RESET';

export interface AppEvent {
  id: string;
  type: EventType;
  entityId?: string;
  data: any;
  timestamp: string;
}

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  broadcast(type: EventType, data: any, entityId?: string) {
    const event: AppEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      entityId,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emit('app_event', event);
    return event;
  }
}

// Global singleton across hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __eventBus: EventBus | undefined;
}

export const eventBus: EventBus = global.__eventBus || new EventBus();
if (process.env.NODE_ENV !== 'production') {
  global.__eventBus = eventBus;
}
