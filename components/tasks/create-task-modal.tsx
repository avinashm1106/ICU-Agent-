'use client';

import { useState } from 'react';
import { StaffMember, post } from '@/components/use-data';
import { PlusCircle, X, AlertTriangle } from 'lucide-react';

interface CreateTaskModalProps {
  staffList: StaffMember[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTaskModal({ staffList, isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    if (!title.trim() || !assignedToId) {
      setError('Title and Staff member are required');
      return;
    }

    setLoading(true);
    setError('');
    setDuplicateWarning(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToId,
      bedNumber: bedNumber ? parseInt(bedNumber, 10) : null,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      source: 'MANUAL',
    };

    try {
      const url = force ? '/api/tasks?force=true' : '/api/tasks';
      await post(url, payload);
      // Reset
      setTitle('');
      setDescription('');
      setAssignedToId('');
      setBedNumber('');
      setPriority('MEDIUM');
      setDeadline('');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.message?.includes('POSSIBLE_DUPLICATE:')) {
        setDuplicateWarning(err.message);
      } else {
        setError(err.message || 'Failed to dispatch task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE8DF]">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#1B5E4B]" />
            <h2 className="text-lg font-bold text-[#18312A]">Create & Dispatch ICU Task</h2>
          </div>
          <button onClick={onClose} className="text-[#65756E] hover:text-[#18312A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              Task Title *
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Check ventilator settings, Verify medication chart"
              className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              Description / Specific Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Confirm tidal volume 450ml and PEEP 8 cmH2O"
              className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#18312A] mb-1">
                Assign To Staff Member *
              </label>
              <select
                required
                className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">-- Select staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.pendingCount} pending)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18312A] mb-1">
                Bed Number (1 – 20)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                placeholder="e.g. 12 (optional)"
                className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#18312A] mb-1">
                Priority Level
              </label>
              <select
                className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18312A] mb-1">
                Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                className="w-full border border-[#DDE8DF] rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-start gap-2 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p>{duplicateWarning}</p>
                  <p className="mt-1 font-normal text-amber-800">
                    An identical task was assigned recently. Do you want to dispatch anyway?
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="mt-2 bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-amber-800"
                  >
                    Dispatch Anyway
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE8DF]">
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
              className="px-5 py-2 bg-[#123C2F] text-white rounded-xl text-xs font-semibold hover:bg-[#1B5E4B] transition disabled:opacity-50"
            >
              {loading ? 'Dispatching...' : 'Dispatch to WhatsApp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
