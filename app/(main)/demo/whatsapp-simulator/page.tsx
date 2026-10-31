'use client';

import { useState, useEffect } from 'react';
import { useDashboard, WhatsAppMessageItem, post } from '@/components/use-data';
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat';
import { DemoToolbar } from '@/components/demo/demo-toolbar';
import {
  Users,
  Grid,
  Columns,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Bed,
  ShieldAlert,
} from 'lucide-react';

export default function WhatsAppSimulatorPage() {
  const { staff, tasks, refresh } = useDashboard();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [allMessages, setAllMessages] = useState<WhatsAppMessageItem[]>([]);
  const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');
  const [loading, setLoading] = useState(false);

  // Set default selected staff once loaded
  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  const fetchAllMessages = async () => {
    try {
      const res = await fetch('/api/whatsapp/messages?all=true', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setAllMessages(json.messages || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAllMessages();
    const interval = setInterval(fetchAllMessages, 2500);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = () => {
        fetchAllMessages();
        refresh();
      };
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [refresh]);

  const activeStaff = staff.find((s) => s.id === selectedStaffId) || staff[0];
  const activeStaffMessages = allMessages.filter((m) => m.userId === activeStaff?.id);
  const activeStaffTasks = tasks.filter((t) => t.assignedToId === activeStaff?.id);

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
              SIMULATOR ENVIRONMENT
            </span>
            <span className="text-[10px] font-bold bg-[#123C2F] text-white px-2 py-0.5 rounded-full">
              Privileged Multi-Account
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
            WhatsApp Multi-Account Simulator
          </h1>
          <p className="text-sm text-[#65756E] mt-1">
            Simultaneously view, observe, and interact with all 6 ICU staff WhatsApp inboxes in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#DDE8DF] rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'split'
                ? 'bg-[#123C2F] text-white shadow-sm'
                : 'text-[#65756E] hover:text-[#18312A]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Split View
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'grid'
                ? 'bg-[#123C2F] text-white shadow-sm'
                : 'text-[#65756E] hover:text-[#18312A]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            6-Inbox Grid View
          </button>
        </div>
      </div>

      {/* Demo Simulation Action Bar */}
      <DemoToolbar onActionComplete={() => { fetchAllMessages(); refresh(); }} />

      {/* VIEW MODE: SPLIT (Selector - Chat - Inspector) */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
          {/* Left Column: Staff Inboxes Selector (3 cols) */}
          <div className="lg:col-span-3 bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE8DF] mb-3">
              <span className="text-xs font-bold text-[#18312A] uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1B5E4B]" />
                Staff Inboxes ({staff.length})
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
                All Live
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {staff.map((s) => {
                const isSelected = s.id === selectedStaffId;
                const staffMsgs = allMessages.filter((m) => m.userId === s.id);
                const lastMsg = staffMsgs[staffMsgs.length - 1];
                const pendingTasksCount = tasks.filter(
                  (t) => t.assignedToId === s.id && ['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(t.status)
                ).length;

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between ${
                      isSelected
                        ? 'bg-[#F4EFE3] border-[#1B5E4B] shadow-sm'
                        : 'bg-white border-[#DDE8DF] hover:bg-[#FAF8F2]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <p className="font-bold text-sm text-[#18312A] truncate">{s.name}</p>
                      </div>
                      <p className="text-[11px] text-[#65756E] truncate mt-1">
                        {lastMsg ? lastMsg.text.substring(0, 32) + '...' : 'No messages'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {pendingTasksCount > 0 && (
                        <span className="bg-[#123C2F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {pendingTasksCount} pending
                        </span>
                      )}
                      <span className="text-[10px] text-[#65756E]">
                        {staffMsgs.length} msgs
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Column: WhatsApp Conversation (6 cols) */}
          <div className="lg:col-span-6 h-[640px]">
            {activeStaff ? (
              <WhatsAppChat
                staffId={activeStaff.id}
                staffName={activeStaff.name}
                staffRole={activeStaff.email.split('@')[0]}
                messages={activeStaffMessages}
                onMessageSent={() => { fetchAllMessages(); refresh(); }}
                isSimulated={true}
              />
            ) : (
              <div className="h-full bg-white rounded-2xl flex items-center justify-center text-[#65756E]">
                Select a staff inbox
              </div>
            )}
          </div>

          {/* Right Column: Live Staff Task Inspector (3 cols) */}
          <div className="lg:col-span-3 bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm flex flex-col space-y-4">
            <div className="pb-3 border-b border-[#DDE8DF]">
              <span className="text-xs font-bold text-[#18312A] uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#1B5E4B]" />
                Live Inspector
              </span>
              <p className="text-xs text-[#65756E] mt-0.5">
                Targeting: <strong className="text-[#18312A]">{activeStaff?.name}</strong>
              </p>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              <p className="text-[11px] font-bold uppercase text-[#65756E]">
                Active Tasks ({activeStaffTasks.length})
              </p>

              {activeStaffTasks.length === 0 ? (
                <p className="text-xs text-[#65756E] italic py-4">No tasks currently assigned</p>
              ) : (
                activeStaffTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 border border-[#DDE8DF] rounded-xl bg-[#FAF8F2] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'BLOCKED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.status}
                      </span>
                      {t.bedNumber && (
                        <span className="text-[10px] font-bold text-[#18312A] flex items-center gap-0.5">
                          <Bed className="w-3 h-3 text-[#1B5E4B]" /> Bed {t.bedNumber}
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-[#18312A]">{t.title}</p>

                    {['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(t.status) && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={async () => {
                            await post('/api/whatsapp/respond', {
                              taskId: t.id,
                              answer: 'YES',
                              userId: activeStaff.id,
                            });
                            fetchAllMessages();
                            refresh();
                          }}
                          className="flex-1 bg-[#123C2F] text-white py-1 rounded text-[11px] font-bold hover:bg-[#1B5E4B]"
                        >
                          Simulate YES
                        </button>
                        <button
                          onClick={async () => {
                            await post('/api/whatsapp/respond', {
                              taskId: t.id,
                              answer: 'NO',
                              reason: 'Occupied with Bed 4 critical patient',
                              userId: activeStaff.id,
                            });
                            fetchAllMessages();
                            refresh();
                          }}
                          className="flex-1 bg-red-700 text-white py-1 rounded text-[11px] font-bold hover:bg-red-800"
                        >
                          Simulate NO
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#DDE8DF] text-[11px] text-[#65756E] space-y-1">
              <p className="font-semibold text-[#18312A]">💡 Demonstration Tip:</p>
              <p>
                Dispatch a voice task mentioning <em>Anitha</em>, <em>Ramesh</em>, and <em>Priya</em>. Watch messages arrive simultaneously in each inbox!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE: 6-INBOX GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => {
            const staffMsgs = allMessages.filter((m) => m.userId === s.id);
            return (
              <div key={s.id} className="h-[520px]">
                <WhatsAppChat
                  staffId={s.id}
                  staffName={s.name}
                  staffRole={s.email.split('@')[0]}
                  messages={staffMsgs}
                  onMessageSent={() => { fetchAllMessages(); refresh(); }}
                  isSimulated={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
