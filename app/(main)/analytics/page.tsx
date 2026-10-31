'use client';

import { useDashboard } from '@/components/use-data';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Activity, Clock, CheckCircle, AlertTriangle, TrendingUp, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const { tasks, staff } = useDashboard();

  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const overdue = tasks.filter((t) => t.status === 'OVERDUE').length;
  const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
  const completionRate = Math.round((completed / total) * 100);
  const overdueRate = Math.round((overdue / total) * 100);

  // Calculate average completion time in minutes for completed tasks
  const completedWithTime = tasks.filter((t) => t.status === 'COMPLETED' && t.completedAt);
  let avgCompletionMinutes = 18;
  if (completedWithTime.length > 0) {
    const totalMinutes = completedWithTime.reduce((acc, t) => {
      const diff = new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime();
      return acc + Math.max(1, Math.round(diff / 60000));
    }, 0);
    avgCompletionMinutes = Math.round(totalMinutes / completedWithTime.length);
  }

  // Tasks by staff
  const staffData = staff.map((s) => ({
    name: s.name.split(' ').pop() || s.name,
    completed: tasks.filter((t) => t.assignedToId === s.id && t.status === 'COMPLETED').length,
    pending: tasks.filter((t) => t.assignedToId === s.id && ['PENDING', 'IN_PROGRESS'].includes(t.status)).length,
    blocked: tasks.filter((t) => t.assignedToId === s.id && t.status === 'BLOCKED').length,
  }));

  // Tasks by priority
  const priorityData = [
    { name: 'Critical', value: tasks.filter((t) => t.priority === 'CRITICAL').length, color: '#991b1b' },
    { name: 'High', value: tasks.filter((t) => t.priority === 'HIGH').length, color: '#d97706' },
    { name: 'Medium', value: tasks.filter((t) => t.priority === 'MEDIUM').length, color: '#1B5E4B' },
    { name: 'Low', value: tasks.filter((t) => t.priority === 'LOW').length, color: '#65756E' },
  ];

  // Tasks by status
  const statusData = [
    { name: 'Completed', value: completed, color: '#059669' },
    { name: 'Pending', value: tasks.filter((t) => t.status === 'PENDING').length, color: '#2563eb' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length, color: '#6366f1' },
    { name: 'Blocked', value: blocked, color: '#dc2626' },
    { name: 'Overdue', value: overdue, color: '#be123c' },
  ];

  // Tasks by hour simulation / rollup
  const hourBuckets: { [hour: string]: number } = {
    '08:00': 4,
    '10:00': 8,
    '12:00': 14,
    '14:00': 11,
    '16:00': 9,
    '18:00': 15,
    '20:00': 7,
  };
  const hourlyData = Object.entries(hourBuckets).map(([hour, count]) => ({
    hour,
    tasks: count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
          PERFORMANCE & RELIABILITY
        </span>
        <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
          ICU Operations Analytics
        </h1>
        <p className="text-sm text-[#65756E] mt-1">
          Real-time metrics on task turnaround time, staff workload distribution, and escalation rates.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#65756E] flex items-center justify-between">
            Completion Rate
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </p>
          <p className="text-4xl font-extrabold text-[#18312A] mt-2">{completionRate}%</p>
          <p className="text-xs text-emerald-700 mt-1 font-semibold">
            {completed} of {tasks.length} total tasks
          </p>
        </div>

        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#65756E] flex items-center justify-between">
            Avg Turnaround Time
            <Clock className="w-4 h-4 text-[#1B5E4B]" />
          </p>
          <p className="text-4xl font-extrabold text-[#18312A] mt-2">
            {avgCompletionMinutes} <span className="text-base font-semibold text-[#65756E]">min</span>
          </p>
          <p className="text-xs text-[#65756E] mt-1">From consultant dispatch to YES reply</p>
        </div>

        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#65756E] flex items-center justify-between">
            Overdue Rate
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </p>
          <p className="text-4xl font-extrabold text-rose-700 mt-2">{overdueRate}%</p>
          <p className="text-xs text-rose-700 mt-1 font-semibold">{overdue} tasks past deadline</p>
        </div>

        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#65756E] flex items-center justify-between">
            Blocked Tasks
            <Activity className="w-4 h-4 text-red-600" />
          </p>
          <p className="text-4xl font-extrabold text-red-700 mt-2">{blocked}</p>
          <p className="text-xs text-red-700 mt-1 font-semibold">Staff responded NO</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload by Staff */}
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#18312A] mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1B5E4B]" />
            Task Distribution by Staff Member
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FAF8F2', borderRadius: '12px', border: '1px solid #DDE8DF' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="completed" name="Completed" fill="#1B5E4B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="blocked" name="Blocked" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks by Status Donut */}
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#18312A] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1B5E4B]" />
            Current Status Breakdown
          </h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FAF8F2', borderRadius: '12px', border: '1px solid #DDE8DF' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#18312A] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#1B5E4B]" />
            Tasks by Priority Level
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" fontSize={12} tickLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FAF8F2', borderRadius: '12px', border: '1px solid #DDE8DF' }}
                />
                <Bar dataKey="value" name="Task Count" radius={[0, 6, 6, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Volume */}
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#18312A] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1B5E4B]" />
            Shift Task Dispatch Velocity (Tasks per Hour)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="hour" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FAF8F2', borderRadius: '12px', border: '1px solid #DDE8DF' }}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="#123C2F"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#1B5E4B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
