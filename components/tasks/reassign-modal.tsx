'use client';

import { useState } from 'react';
import { StaffMember, Task, post } from '@/components/use-data';
import { UserCheck, X } from 'lucide-react';

interface ReassignModalProps {
  task: Task | null;
  staffList: StaffMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignModal({ task, staffList, onClose, onSuccess }: ReassignModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!task) return null;

  const availableStaff = staffList.filter((s) => s.id !== task.assignedToId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Please select a staff member');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await post(`/api/tasks/${task.id}/reassign`, {
        userId: selectedStaffId,
        reason: reason || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE8DF]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1B5E4B]" />
            <h2 className="text-lg font-bold text-[#18312A]">Reassign ICU Task</h2>
          </div>
          <button onClick={onClose} className="text-[#65756E] hover:text-[#18312A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#65756E] uppercase">Task Details</p>
            <p className="text-sm font-bold text-[#18312A] mt-1">{task.title}</p>
            <p className="text-xs text-[#65756E]">
              Current Assignee: <strong className="text-[#18312A]">{task.assignedTo.name}</strong> ·{' '}
              {task.bedNumber ? `Bed ${task.bedNumber}` : 'General ICU'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              Select New Assignee *
            </label>
            <select
              required
              className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">-- Choose staff member --</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.pendingCount} pending) {s.active ? '' : '— INACTIVE'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              Reason for Reassignment (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
              placeholder="e.g. Previous nurse responding to emergency in Bed 2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE8DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#DDE8DF] rounded-xl text-xs font-semibold text-[#65756E] hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#123C2F] text-white rounded-xl text-xs font-semibold hover:bg-[#1B5E4B] transition disabled:opacity-50"
            >
              {loading ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
