'use client';

import { useState } from 'react';
import { useDashboard, Task } from '@/components/use-data';
import { TaskCard } from '@/components/tasks/task-card';
import { ReassignModal } from '@/components/tasks/reassign-modal';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { PlusCircle, Search, Filter, SlidersHorizontal } from 'lucide-react';

export default function TasksPage() {
  const { tasks, staff, refresh } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reassignTargetTask, setReassignTargetTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (staffFilter !== 'ALL' && t.assignedToId !== staffFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchStaff = t.assignedTo.name.toLowerCase().includes(q);
      const matchBed = t.bedNumber?.toString() === q;
      return matchTitle || matchStaff || matchBed;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
            TASK COORDINATION & AUDIT
          </span>
          <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
            ICU Tasks & Dispatch Registry
          </h1>
          <p className="text-sm text-[#65756E] mt-1">
            Comprehensive history and status of all delegated ICU operational tasks.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 bg-[#123C2F] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#1B5E4B] transition shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          + Create New Task
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#65756E]" />
          <input
            type="text"
            placeholder="Search tasks, staff, bed..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#DDE8DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <select
            className="w-full py-2 px-3 text-xs border border-[#DDE8DF] rounded-xl bg-white font-medium text-[#18312A] focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({tasks.length})</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked (NO)</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            className="w-full py-2 px-3 text-xs border border-[#DDE8DF] rounded-xl bg-white font-medium text-[#18312A] focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <option value="ALL">All Staff Members</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="w-full py-2 px-3 text-xs border border-[#DDE8DF] rounded-xl bg-white font-medium text-[#18312A] focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-2 bg-white border border-[#DDE8DF] rounded-2xl p-16 text-center text-[#65756E]">
            No matching tasks found.
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
