'use client';

import { useState } from 'react';
import { useDashboard, useWhatsApp, post } from '@/components/use-data';
import { WhatsAppChat } from '@/components/whatsapp/whatsapp-chat';
import Link from 'next/link';
import { MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

export default function WhatsAppPage() {
  const { staff } = useDashboard();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const { messages, refresh } = useWhatsApp(selectedStaffId || undefined);

  const activeStaff = staff.find((s) => s.id === selectedStaffId) || (staff.length > 0 ? staff[0] : null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1B5E4B]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
              INTERNAL COMMUNICATIONS
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
            ICU WhatsApp Channel
          </h1>
          <p className="text-sm text-[#65756E] mt-1">
            Real-time, database-backed operational task notifications and YES/NO response loop.
          </p>
        </div>

        {staff.length > 0 && (
          <Link
            href="/demo/whatsapp-simulator"
            className="flex items-center gap-1.5 bg-[#123C2F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1B5E4B] transition shadow-sm"
          >
            Open 6-Inbox Multi-Account Simulator
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Staff switcher dropdown for demo convenience */}
      {staff.length > 0 && (
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1B5E4B]" />
            <div>
              <p className="text-xs font-bold text-[#18312A]">Active Inbox Selection</p>
              <p className="text-[11px] text-[#65756E]">
                Viewing inbox for {activeStaff ? activeStaff.name : 'Current User'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#65756E] font-medium">Switch Staff Inbox:</span>
            <select
              className="text-xs border border-[#DDE8DF] rounded-xl px-3 py-1.5 bg-white font-semibold text-[#18312A] focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">Default (My Inbox)</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.pendingCount} pending)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* WhatsApp Chat Interface */}
      <div className="h-[620px] max-w-3xl mx-auto">
        <WhatsAppChat
          staffId={activeStaff?.id || ''}
          staffName={activeStaff?.name || 'My Inbox'}
          staffRole="Clinical Operations"
          messages={messages}
          onMessageSent={refresh}
        />
      </div>
    </div>
  );
}
