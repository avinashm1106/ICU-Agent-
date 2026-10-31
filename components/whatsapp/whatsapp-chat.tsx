'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WhatsAppMessageItem, post } from '@/components/use-data';
import {
  Send,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Bed,
} from 'lucide-react';

interface WhatsAppChatProps {
  staffId: string;
  staffName: string;
  staffRole?: string;
  messages: WhatsAppMessageItem[];
  onMessageSent?: () => void;
  isSimulated?: boolean;
}

export function WhatsAppChat({
  staffId,
  staffName,
  staffRole = 'Staff Nurse',
  messages,
  onMessageSent,
  isSimulated = false,
}: WhatsAppChatProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reasonModalTaskId, setReasonModalTaskId] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  const scrollToBottom = useCallback((force = false) => {
    if (force || !isUserScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Track whether the user has scrolled up manually
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If more than 80px from bottom, user has scrolled up — stop auto-scroll
    isUserScrolledUp.current = distanceFromBottom > 80;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      await post('/api/whatsapp/send', {
        userId: staffId,
        text: inputText.trim(),
      });
      setInputText('');
      isUserScrolledUp.current = false; // reset so next message auto-scrolls
      scrollToBottom(true);
      if (onMessageSent) onMessageSent();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskResponse = async (taskId: string, answer: 'YES' | 'NO', reason?: string) => {
    setLoading(true);
    try {
      await post('/api/whatsapp/respond', {
        taskId,
        answer,
        reason,
        userId: staffId, // pass staffId for simulated dispatch from consultant simulator
      });
      setReasonModalTaskId(null);
      setReasonText('');
      if (onMessageSent) onMessageSent();
    } catch (err: any) {
      alert(`Error responding: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Extract initials
  const initials = staffName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] rounded-2xl overflow-hidden border border-[#DDE8DF] shadow-md">
      {/* WhatsApp Header */}
      <div className="bg-[#123C2F] text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1B5E4B] text-[#FAF8F2] flex items-center justify-center font-bold text-sm border-2 border-white/20">
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
              {staffName}
              {isSimulated && (
                <span className="text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/30 px-1.5 py-0.2 rounded font-normal">
                  Simulated View
                </span>
              )}
            </h3>
            <p className="text-[11px] text-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Online · {staffRole}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white/80">
          <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
          <Video className="w-4 h-4 cursor-pointer hover:text-white" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* WhatsApp Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#d3cbbd_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl text-xs text-[#65756E] border border-stone-200">
              🔒 End-to-end encrypted ICU internal messaging. No operational tasks dispatched yet to this inbox.
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isOut = m.direction === 'OUT'; // Sent to staff (or from system)
            const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isOut ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm relative ${
                    isOut
                      ? 'bg-white text-[#18312A] rounded-tl-sm border border-stone-200'
                      : 'bg-[#D9FDD3] text-[#18312A] rounded-tr-sm border border-emerald-200'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                  {/* If message is linked to an active task, render action buttons */}
                  {m.taskId && m.task && (
                    <div className="mt-3 pt-2.5 border-t border-stone-200/80">
                      <div className="flex items-center justify-between text-xs text-[#65756E] mb-2 font-medium">
                        <span className="flex items-center gap-1 font-bold text-[#18312A]">
                          Status: {m.task.status.replace('_', ' ')}
                        </span>
                        {m.task.bedNumber && (
                          <span className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded text-[10px]">
                            <Bed className="w-3 h-3 text-[#1B5E4B]" /> Bed {m.task.bedNumber}
                          </span>
                        )}
                      </div>

                      {['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(m.task.status) && isOut ? (
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={loading}
                            onClick={() => handleTaskResponse(m.taskId!, 'YES')}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#123C2F] text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-[#1B5E4B] transition shadow-sm active:scale-95"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            YES — Completed
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => setReasonModalTaskId(m.taskId!)}
                            className="flex-1 flex items-center justify-center gap-1 bg-red-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-red-800 transition shadow-sm active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            NO — Unable
                          </button>
                        </div>
                      ) : m.task.status === 'COMPLETED' ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Confirmed Completed
                        </div>
                      ) : m.task.status === 'BLOCKED' ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800 bg-red-50 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Marked Blocked (Unable to execute)
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#65756E]">
                    <span>{time}</span>
                    {isOut ? (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Modal for "NO - Unable" Reason */}
      {reasonModalTaskId && (
        <div className="p-3 bg-white border-t border-[#DDE8DF] space-y-2">
          <p className="text-xs font-bold text-red-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Please specify why you are unable to complete this task:
          </p>
          <input
            type="text"
            placeholder="e.g. Assisting with intubation in Bed 4 / Medication out of stock"
            className="w-full text-xs p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReasonModalTaskId(null)}
              className="text-xs text-stone-500 px-3 py-1"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={() => handleTaskResponse(reasonModalTaskId, 'NO', reasonText)}
              className="text-xs bg-red-700 text-white font-bold px-3 py-1 rounded-lg hover:bg-red-800"
            >
              Confirm NO (Mark Blocked)
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <form onSubmit={handleSendText} className="bg-[#F0F2F5] px-3 py-2.5 flex items-center gap-2 border-t border-stone-200">
        <input
          type="text"
          placeholder="Type a message or response..."
          className="flex-1 bg-white border border-stone-300 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#1B5E4B]"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="bg-[#123C2F] text-white p-2 rounded-full hover:bg-[#1B5E4B] transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
