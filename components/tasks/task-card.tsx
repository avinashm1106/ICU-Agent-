'use client';

import { useState } from 'react';
import { Task, post } from '@/components/use-data';
import {
  Clock,
  User,
  Bed,
  AlertCircle,
  CheckCircle,
  Bell,
  RefreshCw,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  currentUserId?: string;
  userRole?: 'ADMIN' | 'CONSULTANT' | 'STAFF';
  onActionComplete?: () => void;
  onReassignRequest?: (task: Task) => void;
}

export function TaskCard({
  task,
  currentUserId,
  userRole = 'CONSULTANT',
  onActionComplete,
  onReassignRequest,
}: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showNoReason, setShowNoReason] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const isAssignedToMe = currentUserId === task.assignedToId;
  const isManageable = userRole === 'CONSULTANT' || userRole === 'ADMIN';

  const handleRespond = async (answer: 'YES' | 'NO') => {
    setLoading(true);
    setMsg(null);
    try {
      await post(`/api/tasks/${task.id}/respond`, {
        answer,
        reason: answer === 'NO' ? reason : undefined,
      });
      setMsg({ text: answer === 'YES' ? 'Task confirmed completed!' : 'Task marked as blocked.' });
      setShowNoReason(false);
      setReason('');
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setMsg({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async () => {
    setLoading(true);
    try {
      await post(`/api/tasks/${task.id}/remind`);
      setMsg({ text: 'WhatsApp reminder dispatched!' });
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setMsg({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Cancel task "${task.title}"?`)) return;
    setLoading(true);
    try {
      await post(`/api/tasks/${task.id}/cancel`, { reason: 'Cancelled by consultant' });
      setMsg({ text: 'Task cancelled' });
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setMsg({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  // Priority styles
  const priorityStyles = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
    MEDIUM: 'bg-[#DDE8DF] text-[#123C2F] border-[#b6c5b9]',
    LOW: 'bg-stone-100 text-stone-700 border-stone-300',
  }[task.priority] || 'bg-stone-100 text-stone-700';

  // Status styles
  const statusStyles = {
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    PENDING: 'bg-blue-50 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    BLOCKED: 'bg-red-50 text-red-800 border-red-200 font-bold',
    OVERDUE: 'bg-rose-100 text-rose-900 border-rose-300 font-bold animate-pulse',
    CANCELLED: 'bg-stone-100 text-stone-500 border-stone-200 line-through',
  }[task.status] || 'bg-stone-100 text-stone-700';

  const timeAgo = (dateStr: string) => {
    const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ${min % 60}m ago`;
  };

  return (
    <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${priorityStyles}`}>
              {task.priority}
            </span>
            <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusStyles}`}>
              {task.status.replace('_', ' ')}
            </span>
            {task.bedNumber && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F4EFE3] text-[#18312A] border border-[#DDE8DF]">
                <Bed className="w-3 h-3 text-[#1B5E4B]" />
                Bed {task.bedNumber}
              </span>
            )}
            <span className="text-[11px] text-[#65756E] flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {timeAgo(task.createdAt)}
            </span>
          </div>

          <h3 className="text-base font-bold text-[#18312A]">{task.title}</h3>

          {task.description && (
            <p className="text-xs text-[#65756E] mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-[#F4EFE3] text-xs text-[#65756E]">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#1B5E4B]" />
              Assignee: <strong className="text-[#18312A] ml-0.5">{task.assignedTo.name}</strong>
            </span>
            <span>
              By: <span className="text-[#18312A]">{task.createdBy.name}</span>
            </span>
            {task.completedAt && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Done at {new Date(task.completedAt).toLocaleTimeString()}
              </span>
            )}
            {task.status === 'BLOCKED' && (
              <span className="text-red-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Blocked: Awaiting Reassignment
              </span>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mt-3 p-2 rounded-lg text-xs font-semibold ${msg.error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {msg.text}
        </div>
      )}

      {/* Staff Response Actions */}
      {['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(task.status) && (isAssignedToMe || userRole !== 'STAFF') && (
        <div className="mt-4 pt-3 border-t border-[#DDE8DF] flex flex-wrap items-center justify-between gap-2">
          {showNoReason ? (
            <div className="w-full space-y-2">
              <input
                type="text"
                placeholder="Specify reason for being unable (e.g. Ventilator alarm on Bed 6)..."
                className="w-full text-xs p-2 border border-red-300 rounded-lg focus:outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNoReason(false)}
                  className="text-xs px-2.5 py-1 text-stone-500"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleRespond('NO')}
                  className="text-xs bg-red-700 text-white font-semibold px-3 py-1 rounded-lg hover:bg-red-800"
                >
                  Submit Blocked Status
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={loading}
                onClick={() => handleRespond('YES')}
                className="flex items-center gap-1 bg-[#123C2F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1B5E4B] transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                YES — Completed
              </button>
              <button
                disabled={loading}
                onClick={() => setShowNoReason(true)}
                className="flex items-center gap-1 border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                NO — Unable
              </button>
            </div>
          )}

          {/* Consultant Control Actions */}
          {isManageable && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                disabled={loading}
                onClick={handleRemind}
                title="Send reminder via WhatsApp"
                className="flex items-center gap-1 text-xs border border-[#b6c5b9] text-[#123C2F] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[#DDE8DF]"
              >
                <Bell className="w-3.5 h-3.5" />
                Remind
              </button>
              <button
                disabled={loading}
                onClick={() => onReassignRequest && onReassignRequest(task)}
                title="Reassign to another staff member"
                className="flex items-center gap-1 text-xs border border-amber-300 text-amber-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-amber-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reassign
              </button>
              <button
                disabled={loading}
                onClick={handleCancel}
                title="Cancel task"
                className="text-xs text-stone-400 hover:text-red-700 p-1.5"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Blocked state quick reassign button for consultant */}
      {task.status === 'BLOCKED' && isManageable && (
        <div className="mt-3 pt-3 border-t border-red-200 flex items-center justify-between bg-red-50/50 p-2.5 rounded-xl">
          <span className="text-xs font-bold text-red-800">
            ⚠️ Staff is unable to complete. Reassignment needed.
          </span>
          <button
            onClick={() => onReassignRequest && onReassignRequest(task)}
            className="flex items-center gap-1 bg-[#123C2F] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1B5E4B]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reassign Now
          </button>
        </div>
      )}
    </div>
  );
}
