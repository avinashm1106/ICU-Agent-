'use client';

import { useState } from 'react';
import { post } from '@/components/use-data';
import { Zap, Clock, Bell, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface DemoToolbarProps {
  onActionComplete?: () => void;
}

export function DemoToolbar({ onActionComplete }: DemoToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [open, setOpen] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const triggerAction = async (action: string, extra: any = {}) => {
    setLoading(true);
    try {
      const res = await post('/api/demo', { action, ...extra });
      showMsg(res.message || `Action executed: ${action.replace('_', ' ')}`, 'success');
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const setEscalationTiming = async (firstSec: number, secSec: number, escSec: number, label: string) => {
    setLoading(true);
    try {
      await post('/api/escalation', {
        firstSeconds: firstSec,
        secondSeconds: secSec,
        escalateSeconds: escSec,
      });
      showMsg(`Escalation rule set to demo preset: ${label}`, 'success');
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#DDE8DF] rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-[#123C2F] text-white p-1.5 rounded-lg">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18312A] flex items-center gap-2">
              DEMO SIMULATION CONTROLS
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#DDE8DF] text-[#123C2F]">
                Active
              </span>
            </h3>
            <p className="text-xs text-[#65756E]">
              Simulate staff responses and fast escalation cycles live
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={loading}
            onClick={() => triggerAction('SIMULATE_YES')}
            className="flex items-center gap-1.5 bg-[#1B5E4B] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#123C2F] transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Simulate YES
          </button>

          <button
            disabled={loading}
            onClick={() => triggerAction('SIMULATE_NO')}
            className="flex items-center gap-1.5 bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-800 transition disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Simulate NO (Blocked)
          </button>

          <button
            disabled={loading}
            onClick={() => triggerAction('TRIGGER_REMINDER')}
            className="flex items-center gap-1.5 bg-stone-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-800 transition disabled:opacity-50"
          >
            <Bell className="w-3.5 h-3.5" />
            Trigger Remind
          </button>

          <button
            disabled={loading}
            onClick={() => triggerAction('SIMULATE_DELAY')}
            className="flex items-center gap-1.5 border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5" />
            Simulate Delay (Age 40m)
          </button>

          <button
            disabled={loading}
            onClick={() => triggerAction('TRIGGER_ESCALATION')}
            className="flex items-center gap-1.5 border border-[#1B5E4B] text-[#1B5E4B] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#DDE8DF]/40 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Escalation Check
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="text-xs text-[#65756E] underline hover:text-[#18312A] ml-2"
          >
            {open ? 'Hide Presets' : 'Escalation Presets'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-[#DDE8DF] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#65756E] font-medium mr-2">Demo Escalation Timers:</span>
          <button
            onClick={() => setEscalationTiming(10, 20, 30, '30 Seconds')}
            className="text-xs px-2.5 py-1 bg-[#FAF8F2] border border-[#DDE8DF] rounded-md hover:bg-[#DDE8DF] font-medium"
          >
            ⚡ 30s Fast Demo
          </button>
          <button
            onClick={() => setEscalationTiming(20, 40, 60, '1 Minute')}
            className="text-xs px-2.5 py-1 bg-[#FAF8F2] border border-[#DDE8DF] rounded-md hover:bg-[#DDE8DF] font-medium"
          >
            1 Minute
          </button>
          <button
            onClick={() => setEscalationTiming(40, 80, 120, '2 Minutes')}
            className="text-xs px-2.5 py-1 bg-[#FAF8F2] border border-[#DDE8DF] rounded-md hover:bg-[#DDE8DF] font-medium"
          >
            2 Minutes
          </button>
          <button
            onClick={() => setEscalationTiming(100, 200, 300, '5 Minutes')}
            className="text-xs px-2.5 py-1 bg-[#FAF8F2] border border-[#DDE8DF] rounded-md hover:bg-[#DDE8DF] font-medium"
          >
            5 Minutes
          </button>
          <button
            onClick={() => setEscalationTiming(900, 1800, 2700, 'Standard (15m/30m/45m)')}
            className="text-xs px-2.5 py-1 bg-[#FAF8F2] border border-[#DDE8DF] rounded-md hover:bg-[#DDE8DF] font-medium text-stone-600"
          >
            Standard (15m/30m/45m)
          </button>
        </div>
      )}

      {message && (
        <div
          className={`mt-3 p-2.5 rounded-lg text-xs font-semibold ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
