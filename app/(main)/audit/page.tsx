'use client';

import { useState, useEffect } from 'react';
import { AuditRecord } from '@/components/use-data';
import { ShieldCheck, Search, Filter, Clock, User, Activity } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const url = actionFilter !== 'ALL' ? `/api/audit?action=${actionFilter}` : '/api/audit';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchAction = l.action.toLowerCase().includes(q);
    const matchActor = l.actor?.name.toLowerCase().includes(q);
    const matchEntity = l.entity.toLowerCase().includes(q);
    return matchAction || matchActor || matchEntity;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('COMPLETED') || action.includes('YES')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (action.includes('BLOCKED') || action.includes('NO') || action.includes('ESCALATION')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (action.includes('REMINDER')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (action.includes('REASSIGNED')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return 'bg-[#DDE8DF] text-[#123C2F] border-[#b6c5b9]';
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
          COMPLIANCE & TRACEABILITY
        </span>
        <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
          ICU Operations Audit Trail
        </h1>
        <p className="text-sm text-[#65756E] mt-1">
          Immutable event log of every clinical task dispatch, WhatsApp message, staff response, and escalation trigger.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#65756E]" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, or entity..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#DDE8DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#65756E]" />
          <select
            className="text-xs border border-[#DDE8DF] rounded-xl px-3 py-2 bg-white font-medium text-[#18312A] focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">All Event Types</option>
            <option value="TASK_CREATED">TASK_CREATED</option>
            <option value="TASK_COMPLETED">TASK_COMPLETED (YES)</option>
            <option value="TASK_BLOCKED">TASK_BLOCKED (NO)</option>
            <option value="TASK_REASSIGNED">TASK_REASSIGNED</option>
            <option value="REMINDER_SENT">REMINDER_SENT</option>
            <option value="ESCALATION_TRIGGERED">ESCALATION_TRIGGERED</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F2] border-b border-[#DDE8DF] text-[#65756E] uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Metadata / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE8DF]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#65756E]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#65756E]">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F2]/60 transition">
                    <td className="p-3.5 whitespace-nowrap text-[#65756E] font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-bold text-[#18312A]">
                      {log.actor?.name || 'Automated Scheduler'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-[#65756E]">
                      {log.entity} <span className="font-mono text-[10px]">({log.entityId?.substring(0, 8)}...)</span>
                    </td>
                    <td className="p-3.5 max-w-xs truncate font-mono text-[11px] text-[#18312A]">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
