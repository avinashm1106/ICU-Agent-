'use client';

import { useState, useEffect } from 'react';
import { Mic, Clock, Sparkles, ChevronDown, ChevronUp, User, Bed, CheckCircle } from 'lucide-react';

interface VoiceSessionItem {
  id: string;
  transcript: string;
  extraction: any;
  createdAt: string;
  consultant: { id: string; name: string };
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    bedNumber: number | null;
    assignedTo: { name: string };
  }[];
}

export default function VoiceHistoryPage() {
  const [sessions, setSessions] = useState<VoiceSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/voice-sessions', { cache: 'no-store' });
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
          AUDIT & EXTRACTION ARCHIVE
        </span>
        <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
          Voice Agent Session History
        </h1>
        <p className="text-sm text-[#65756E] mt-1">
          Complete audit trail of spoken instructions, AI structured extractions, and resultant dispatched tasks.
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-[#DDE8DF] rounded-2xl p-12 text-center text-[#65756E]">
            Loading voice session history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-[#DDE8DF] rounded-2xl p-12 text-center text-[#65756E]">
            No voice sessions recorded yet. Launch the Voice Agent to record your first clinical instruction.
          </div>
        ) : (
          sessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const extractedTasks = s.extraction?.tasks || [];
            const uncertainItems = s.extraction?.uncertainItems || [];

            return (
              <div
                key={s.id}
                className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm space-y-3 transition"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DDE8DF] text-[#123C2F] flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#18312A] line-clamp-1">
                        &ldquo;{s.transcript}&rdquo;
                      </h3>
                      <p className="text-xs text-[#65756E] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#1B5E4B]" />
                          Dr. {s.consultant.name}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(s.createdAt).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-[#FAF8F2] border border-[#DDE8DF] px-2.5 py-1 rounded-full text-[#18312A]">
                      {extractedTasks.length} tasks extracted
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#65756E]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#65756E]" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#DDE8DF] space-y-4">
                    <div>
                      <p className="text-xs font-bold text-[#65756E] uppercase">Full Spoken Audio Transcript</p>
                      <p className="text-xs bg-[#FAF8F2] p-3 rounded-xl border border-[#DDE8DF] mt-1 text-[#18312A] font-medium leading-relaxed">
                        {s.transcript}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#65756E] uppercase flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#1B5E4B]" />
                        Structured AI Task Interpretations
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {extractedTasks.map((t: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#FAF8F2] border border-[#DDE8DF] rounded-xl text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#18312A]">{t.title}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDE8DF] text-[#123C2F]">
                                {t.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#65756E]">
                              Assignee: <strong>{t.assigneeName || 'Unassigned'}</strong> ·{' '}
                              {t.bedNumber ? `Bed ${t.bedNumber}` : 'General ICU'}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-semibold">
                              Confidence: {Math.round((t.confidence || 0.9) * 100)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {uncertainItems.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <strong>Flagged Items:</strong> {uncertainItems.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
