'use client';

import { useState } from 'react';
import { useDashboard, Task } from '@/components/use-data';
import { TaskCard } from '@/components/tasks/task-card';
import { ReassignModal } from '@/components/tasks/reassign-modal';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { DemoToolbar } from '@/components/demo/demo-toolbar';
import Link from 'next/link';
import {
  Mic,
  PlusCircle,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Users,
  Bell,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export default function DashboardPage() {
  const { metrics, tasks, staff, notifications, refresh, error, connected } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reassignTargetTask, setReassignTargetTask] = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CRITICAL') return t.priority === 'CRITICAL';
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
              ICU COMMAND CENTER
            </span>
            <span className="text-[11px] text-[#65756E]">
              · St. Raphael Medical Center · ICU-01
            </span>
            <span className="text-[10px] font-semibold bg-[#DDE8DF] text-[#123C2F] px-2 py-0.5 rounded-full">
              {connected ? '● Live SSE Stream' : '○ Polling Sync'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#18312A] mt-1">
            Clinical Operations Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 border border-[#1B5E4B] text-[#1B5E4B] text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#DDE8DF]/40 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            + Manual Task
          </button>

          <Link
            href="/voice"
            className="flex items-center gap-2 bg-[#123C2F] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#1B5E4B] transition shadow-md"
          >
            <Mic className="w-4 h-4" />
            🎙 Start Voice Agent
          </Link>
        </div>
      </div>

      {/* Demo Simulation Bar */}
      <DemoToolbar onActionComplete={refresh} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'ALL' ? 'border-[#123C2F] ring-2 ring-[#123C2F]/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-[#65756E] flex items-center justify-between">
            Total Tasks
            <Activity className="w-3.5 h-3.5 text-[#1B5E4B]" />
          </p>
          <p className="text-3xl font-extrabold text-[#18312A] mt-2">{metrics.total}</p>
        </div>

        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'COMPLETED' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-emerald-800 flex items-center justify-between">
            Completed
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">{metrics.completed}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'PENDING' ? 'border-blue-600 ring-2 ring-blue-600/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-blue-800 flex items-center justify-between">
            Pending
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </p>
          <p className="text-3xl font-extrabold text-blue-700 mt-2">{metrics.pending}</p>
        </div>

        <div
          onClick={() => setStatusFilter('OVERDUE')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'OVERDUE' ? 'border-rose-600 ring-2 ring-rose-600/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-rose-800 flex items-center justify-between">
            Overdue
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </p>
          <p className="text-3xl font-extrabold text-rose-700 mt-2">{metrics.overdue}</p>
        </div>

        <div
          onClick={() => setStatusFilter('BLOCKED')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'BLOCKED' ? 'border-red-600 ring-2 ring-red-600/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-red-800 flex items-center justify-between">
            Blocked (NO)
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          </p>
          <p className="text-3xl font-extrabold text-red-700 mt-2">{metrics.blocked}</p>
        </div>

        <div
          onClick={() => setStatusFilter('CRITICAL')}
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition shadow-sm ${
            statusFilter === 'CRITICAL' ? 'border-red-700 ring-2 ring-red-700/10' : 'border-[#DDE8DF]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-red-900 flex items-center justify-between">
            Critical Active
            <span className="w-2 h-2 rounded-full bg-red-600" />
          </p>
          <p className="text-3xl font-extrabold text-red-800 mt-2">{metrics.critical}</p>
        </div>
      </div>

      {/* Unread Alerts Banner */}
      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900 uppercase">
            <span className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-700" />
              Active System & Escalation Alerts ({notifications.length})
            </span>
            <button
              onClick={async () => {
                await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({}) });
                refresh();
              }}
              className="text-[11px] text-amber-800 underline hover:text-amber-950 font-medium"
            >
              Acknowledge All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="p-2.5 bg-white/80 rounded-xl text-xs font-semibold text-amber-950 border border-amber-200 flex items-center justify-between"
              >
                <span>{n.text}</span>
                <span className="text-[10px] text-stone-500 ml-2">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Live Task Board (2 cols) + Staff Status Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Task Board (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#18312A]">Live Task Board</h2>
              <span className="text-xs bg-[#FAF8F2] text-[#65756E] border border-[#DDE8DF] px-2 py-0.5 rounded-full font-semibold">
                {filteredTasks.length} tasks
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                ['ALL', 'All'],
                ['CRITICAL', 'Critical'],
                ['PENDING', 'Pending'],
                ['IN_PROGRESS', 'In Progress'],
                ['BLOCKED', 'Blocked'],
                ['OVERDUE', 'Overdue'],
                ['COMPLETED', 'Completed'],
              ].map(([st, label]) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === st
                      ? 'bg-[#123C2F] text-white shadow-sm'
                      : 'text-[#65756E] hover:bg-[#FAF8F2]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white border border-[#DDE8DF] rounded-2xl p-12 text-center text-[#65756E]">
                No tasks currently in &ldquo;{statusFilter}&rdquo; status.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  userRole="CONSULTANT"
                  onActionComplete={refresh}
                  onReassignRequest={(t) => setReassignTargetTask(t)}
                />
              ))
            )}
          </div>
        </div>

        {/* Staff Status Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE8DF]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1B5E4B]" />
                <h2 className="text-base font-bold text-[#18312A]">Staff Live Workload</h2>
              </div>
              <button
                onClick={refresh}
                className="text-xs text-[#65756E] hover:text-[#18312A] flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync
              </button>
            </div>

            <div className="space-y-3">
              {staff.map((s) => {
                const badgeColor =
                  s.statusLabel === 'Available'
                    ? 'bg-emerald-100 text-emerald-800'
                    : s.statusLabel === 'Busy'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-600';

                return (
                  <div
                    key={s.id}
                    className="p-3.5 border border-[#DDE8DF] rounded-xl bg-[#FAF8F2] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.statusLabel === 'Available'
                              ? 'bg-emerald-500'
                              : s.statusLabel === 'Busy'
                              ? 'bg-amber-500'
                              : 'bg-stone-400'
                          }`}
                        />
                        <p className="font-bold text-sm text-[#18312A]">{s.name}</p>
                      </div>
                      <p className="text-[11px] text-[#65756E] mt-0.5">
                        <strong className="text-[#18312A]">{s.pendingCount}</strong> pending ·{' '}
                        <strong className="text-emerald-700">{s.completedCount}</strong> completed ·{' '}
                        <strong className="text-red-700">{s.blockedCount}</strong> blocked
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
                    >
                      {s.statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#DDE8DF]">
              <Link
                href="/demo/whatsapp-simulator"
                className="block text-center text-xs font-bold text-[#1B5E4B] hover:text-[#123C2F] py-2 bg-[#DDE8DF]/40 rounded-xl hover:bg-[#DDE8DF]"
              >
                Open Multi-Account WhatsApp Simulator →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReassignModal
        task={reassignTargetTask}
        staffList={staff}
        onClose={() => setReassignTargetTask(null)}
        onSuccess={refresh}
      />

      <CreateTaskModal
        staffList={staff}
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
