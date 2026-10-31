'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bedNumber: number | null;
  assignedToId: string;
  createdById: string;
  source: 'VOICE' | 'MANUAL' | 'SYSTEM';
  deadline: string | null;
  completedAt: string | null;
  responseAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  patient?: { id: string; name: string; bedNumber: number } | null;
  reminders?: { level: number }[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
  statusLabel: 'Available' | 'Busy' | 'Offline';
  pendingCount: number;
  completedCount: number;
  blockedCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  metadata?: any;
  actor?: { name: string; role: string } | null;
}

export interface DashboardData {
  metrics: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    overdue: number;
    blocked: number;
    critical: number;
  };
  tasks: Task[];
  staff: StaffMember[];
  notifications: NotificationItem[];
  recentActivity: AuditRecord[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    metrics: { total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0, blocked: 0, critical: 0 },
    tasks: [],
    staff: [],
    notifications: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // 1. Real-time updates via Server-Sent Events (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onopen = () => setConnected(true);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type && parsed.type !== 'CONNECTED') {
            // Live update triggered by event bus
            refresh();
          }
        } catch {}
      };
      eventSource.onerror = () => {
        setConnected(false);
      };
    } catch {}

    // 2. Reliable fallback short polling (every 3 seconds)
    refreshTimer.current = setInterval(refresh, 3000);

    return () => {
      if (eventSource) eventSource.close();
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [refresh]);

  return {
    ...data,
    loading,
    error,
    connected,
    refresh,
  };
}

export interface WhatsAppMessageItem {
  id: string;
  userId: string;
  taskId: string | null;
  text: string;
  direction: 'IN' | 'OUT';
  createdAt: string;
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    bedNumber: number | null;
    completedAt: string | null;
  } | null;
  user?: { id: string; name: string } | null;
}

export function useWhatsApp(userId?: string) {
  const [messages, setMessages] = useState<WhatsAppMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const url = userId ? `/api/whatsapp/messages?userId=${userId}` : '/api/whatsapp/messages';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load messages');
      const json = await res.json();
      setMessages(Array.isArray(json) ? json : json.messages || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2500);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = () => {
        load();
      };
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [load]);

  return { messages, loading, error, refresh: load };
}

export async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg =
      typeof data.error === 'string'
        ? data.error
        : data.error?.formErrors?.join(', ') || 'Request failed';
    throw new Error(errorMsg);
  }
  return data;
}

export async function patch(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
