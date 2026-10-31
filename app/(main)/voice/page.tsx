'use client';

import { useState, useRef, useEffect } from 'react';
import { useDashboard, post } from '@/components/use-data';
import { useRouter } from 'next/navigation';
import {
  Mic,
  Square,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Trash2,
  Clock,
  Bed,
  User,
  ArrowRight,
} from 'lucide-react';

interface ExtractedTaskItem {
  title: string;
  description: string;
  assigneeName: string | null;
  assignedToId?: string;
  bedNumber: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string | null;
  confidence: number;
}

export default function VoiceAgentPage() {
  const { staff } = useDashboard();
  const router = useRouter();

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState<ExtractedTaskItem[]>([]);
  const [uncertainItems, setUncertainItems] = useState<string[]>([]);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Recording timer
  useEffect(() => {
    if (recording) {
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await handleTranscribe(audioBlob);
      };

      recorder.start(250);
      setRecording(true);
    } catch (err: any) {
      setError(
        'Microphone permission denied or device not found. You can also paste or select a sample transcript below.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    setExtracting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('file', audioBlob, 'voice.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscript(data.transcript);
      // Automatically proceed to extract
      await handleExtractTasks(data.transcript);
    } catch (err: any) {
      setError(err.message || 'Speech transcription failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractTasks = async (textToExtract?: string) => {
    const text = textToExtract || transcript;
    if (!text.trim()) {
      setError('Please record or enter a voice transcript first');
      return;
    }

    setExtracting(true);
    setError('');
    try {
      const res = await post('/api/ai/extract-tasks', { transcript: text });
      setVoiceSessionId(res.voiceSessionId || null);

      // Match extracted assignee names to actual staff IDs
      const mappedTasks = (res.tasks || []).map((t: any) => {
        let matchedId = '';
        if (t.assigneeName) {
          const found = staff.find(
            (s) =>
              s.name.toLowerCase() === t.assigneeName.toLowerCase() ||
              s.name.toLowerCase().includes(t.assigneeName.toLowerCase()) ||
              t.assigneeName.toLowerCase().includes(s.name.toLowerCase().split(' ').pop() || '')
          );
          if (found) matchedId = found.id;
        }
        return {
          ...t,
          assignedToId: matchedId,
        };
      });

      setTasks(mappedTasks);
      setUncertainItems(res.uncertainItems || []);
    } catch (err: any) {
      setError(err.message || 'AI task extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleDispatchAll = async () => {
    if (tasks.length === 0) return;

    // Validate all have assignees
    for (const t of tasks) {
      if (!t.assignedToId) {
        setError(`Please assign a staff member for: "${t.title}"`);
        return;
      }
    }

    setDispatching(true);
    setError('');
    try {
      for (const t of tasks) {
        await post('/api/tasks?force=true', {
          title: t.title,
          description: t.description || undefined,
          assignedToId: t.assignedToId,
          bedNumber: t.bedNumber ? Number(t.bedNumber) : null,
          priority: t.priority,
          deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
          source: 'VOICE',
          voiceSessionId,
        });
      }

      setSuccessMsg(
        `Successfully dispatched ${tasks.length} task${tasks.length > 1 ? 's' : ''} to WhatsApp inboxes!`
      );
      setTasks([]);
      setUncertainItems([]);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch tasks');
    } finally {
      setDispatching(false);
    }
  };

  const sampleTranscripts = [
    'Nurse Anitha check the medication chart for Bed 8 and confirm once completed. Ramesh check the ventilator settings for Bed 12. Sister Priya make sure the emergency trolley is fully stocked.',
    'Dr. Kumar review the arterial blood gas report for Bed 15 immediately. Ramesh check the oxygen cylinder pressure on the transport trolley. Suresh prepare Bed 7 for incoming cardiac arrest.',
    'Sister Priya verify the narcotics count with the night shift. Nurse Anitha check insulin infusion rate for Bed 3. Someone check why the monitor in Bed 9 is beeping.',
  ];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
          AI SPEECH ORCHESTRATION
        </span>
        <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">ICU Voice Agent</h1>
        <p className="text-sm text-[#65756E] mt-1">
          Speak natural operational commands. AI transcribes and extracts structured clinical tasks for review before WhatsApp dispatch.
        </p>
      </div>

      {/* Prominent Recording Station */}
      <div className="bg-white border border-[#DDE8DF] rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
        <div className="max-w-md mx-auto space-y-5">
          {/* Waveform / Aura Pulse animation */}
          <div className="relative flex items-center justify-center">
            {recording && (
              <div className="absolute w-36 h-36 rounded-full bg-red-400/20 animate-ping" />
            )}
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition transform active:scale-95 z-10 ${
                recording
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-[#123C2F] hover:bg-[#1B5E4B]'
              }`}
            >
              {recording ? (
                <>
                  <Square className="w-9 h-9 mb-1" />
                  <span className="text-xs font-bold">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 mb-1" />
                  <span className="text-xs font-bold tracking-wider">SPEAK</span>
                </>
              )}
            </button>
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#18312A]">
              {recording ? (
                <span className="text-red-700 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                  Recording Audio ({formatTimer(recordSeconds)})
                </span>
              ) : (
                'START VOICE AGENT'
              )}
            </h3>
            <p className="text-xs text-[#65756E] mt-1">
              {recording
                ? 'Listening to clinical instructions... Click Stop when finished.'
                : 'Click button to record microphone instructions, or select a sample transcript.'}
            </p>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="mt-8 pt-6 border-t border-[#DDE8DF] text-left">
          <p className="text-xs font-bold text-[#18312A] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1B5E4B]" />
            Quick Demo Spoken Transcripts (Click to load):
          </p>
          <div className="grid grid-cols-1 gap-2">
            {sampleTranscripts.map((t, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTranscript(t);
                  handleExtractTasks(t);
                }}
                className="text-left text-xs bg-[#FAF8F2] hover:bg-[#F4EFE3] border border-[#DDE8DF] p-3 rounded-xl transition text-[#18312A] font-medium"
              >
                &ldquo;{t}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript Review Section */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#18312A] flex items-center gap-2">
            Spoken Transcript Review
          </h2>
          {transcript && (
            <button
              onClick={() => {
                setTranscript('');
                setTasks([]);
              }}
              className="text-xs text-[#65756E] hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Recorded speech appears here. You can also paste or edit transcript text before AI extraction..."
          className="w-full border border-[#DDE8DF] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E4B] bg-[#FAF8F2]"
        />

        <div className="flex justify-end">
          <button
            disabled={extracting || !transcript.trim()}
            onClick={() => handleExtractTasks()}
            className="flex items-center gap-2 bg-[#123C2F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1B5E4B] transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
            {extracting ? 'Extracting with AI...' : 'Extract Tasks with AI'}
          </button>
        </div>
      </div>

      {/* Uncertain Items Alert */}
      {uncertainItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Items Requiring Consultant Confirmation ({uncertainItems.length})
          </div>
          {uncertainItems.map((item, i) => (
            <p key={i} className="text-xs text-amber-800 font-medium">
              • {item}
            </p>
          ))}
        </div>
      )}

      {/* AI Task Confirmation & Dispatch Station */}
      {tasks.length > 0 && (
        <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DDE8DF]">
            <div>
              <h2 className="text-lg font-bold text-[#18312A] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#1B5E4B]" />
                AI Interpretation — Confirm Before Dispatch ({tasks.length} Tasks)
              </h2>
              <p className="text-xs text-[#65756E] mt-0.5">
                Review and edit any assignee or details before sending WhatsApp notifications.
              </p>
            </div>

            <button
              onClick={() => setTasks([])}
              className="text-xs text-[#65756E] hover:text-[#18312A]"
            >
              Cancel All
            </button>
          </div>

          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className="p-4 border border-[#DDE8DF] rounded-xl bg-[#FAF8F2] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B5E4B] uppercase">
                    Task {idx + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-[#65756E]">
                    Confidence: {Math.round(task.confidence * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-[#18312A] mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs font-semibold p-2 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none"
                      value={task.title}
                      onChange={(e) =>
                        setTasks((list) =>
                          list.map((t, i) => (i === idx ? { ...t, title: e.target.value } : t))
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-[#18312A] mb-1">
                      Assignee *
                    </label>
                    <select
                      className={`w-full text-xs font-semibold p-2 border rounded-lg bg-white focus:outline-none ${
                        !task.assignedToId ? 'border-red-400 bg-red-50' : 'border-[#DDE8DF]'
                      }`}
                      value={task.assignedToId || ''}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const sObj = staff.find((s) => s.id === sId);
                        setTasks((list) =>
                          list.map((t, i) =>
                            i === idx
                              ? {
                                  ...t,
                                  assignedToId: sId,
                                  assigneeName: sObj ? sObj.name : null,
                                }
                              : t
                          )
                        );
                      }}
                    >
                      <option value="">-- Assign Staff --</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-[#18312A] mb-1">
                      Bed
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="—"
                      className="w-full text-xs font-semibold p-2 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none text-center"
                      value={task.bedNumber || ''}
                      onChange={(e) =>
                        setTasks((list) =>
                          list.map((t, i) =>
                            i === idx
                              ? {
                                  ...t,
                                  bedNumber: e.target.value ? Number(e.target.value) : null,
                                }
                              : t
                          )
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#18312A] mb-1">
                      Priority
                    </label>
                    <select
                      className="w-full text-xs font-semibold p-2 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none"
                      value={task.priority}
                      onChange={(e) =>
                        setTasks((list) =>
                          list.map((t, i) =>
                            i === idx
                              ? { ...t, priority: e.target.value as ExtractedTaskItem['priority'] }
                              : t
                          )
                        )
                      }
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DDE8DF]">
            <p className="text-xs text-[#65756E]">
              Pressing dispatch will send real-time WhatsApp messages to each assigned staff member.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTasks([])}
                className="px-4 py-2 border border-[#DDE8DF] rounded-xl text-xs font-semibold text-[#65756E] hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatching}
                onClick={handleDispatchAll}
                className="flex items-center gap-2 bg-[#123C2F] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#1B5E4B] transition shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {dispatching ? 'Dispatching...' : 'CONFIRM & DISPATCH ALL TASKS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-700" />
            <div>
              <p className="font-bold text-sm text-emerald-900">{successMsg}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Messages have appeared in the staff members&apos; Mock WhatsApp inboxes.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/demo/whatsapp-simulator')}
            className="flex items-center gap-1.5 bg-[#123C2F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1B5E4B] shadow-sm"
          >
            Open WhatsApp Simulator
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
