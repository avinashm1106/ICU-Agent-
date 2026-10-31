import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const u = await currentUser();
  if (!u) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const where: any = {};
  if (u.role === 'STAFF') {
    where.assignedToId = u.id;
  } else if (u.role === 'CONSULTANT') {
    where.icuId = u.icuId || '';
  }

  try {
    const [tasks, staffList, notifications, recentAudit] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          reminders: { orderBy: { level: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.user.findMany({
        where: {
          role: 'STAFF',
          ...(u.role !== 'ADMIN' && u.icuId ? { icuId: u.icuId } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          assigned: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      db.notification.findMany({
        where: { userId: u.id, read: false },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      db.auditLog.findMany({
        include: {
          actor: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Compute staff status workload dynamically
    const staff = staffList.map((s) => {
      const pending = s.assigned.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;
      const completed = s.assigned.filter((t) => t.status === 'COMPLETED').length;
      const blocked = s.assigned.filter((t) => t.status === 'BLOCKED').length;
      let statusLabel: 'Available' | 'Busy' | 'Offline' = 'Available';
      if (!s.active) {
        statusLabel = 'Offline';
      } else if (pending >= 3) {
        statusLabel = 'Busy';
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        active: s.active,
        statusLabel,
        pendingCount: pending,
        completedCount: completed,
        blockedCount: blocked,
      };
    });

    const metrics = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      overdue: tasks.filter((t) => t.status === 'OVERDUE').length,
      blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
      critical: tasks.filter((t) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length,
    };

    return NextResponse.json({
      metrics,
      tasks,
      staff,
      notifications,
      recentActivity: recentAudit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
