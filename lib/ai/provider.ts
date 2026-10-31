import { extraction } from '@/lib/validation';

export interface ExtractedTask {
  title: string;
  description: string;
  assigneeName: string | null;
  bedNumber: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string | null;
  confidence: number;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  uncertainItems: string[];
}

export interface AIProvider {
  transcribeAudio(file: Blob | File | Buffer, mimeType?: string): Promise<string>;
  extractTasks(transcript: string, staffList: { id: string; name: string }[]): Promise<ExtractionResult>;
}

export class GroqProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private transcriptionModel: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
    this.transcriptionModel = process.env.AI_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo';
  }

  async transcribeAudio(file: Blob | File | Buffer, mimeType = 'audio/webm'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI_API_KEY is not configured in .env. Please provide a valid Groq API key.');
    }

    const formData = new FormData();
    if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
      formData.set('file', file, 'voice.webm');
    } else {
      // Buffer
      const blob = new Blob([file as any], { type: mimeType });
      formData.set('file', blob, 'voice.webm');
    }
    formData.set('model', this.transcriptionModel);
    formData.set('language', 'en');
    formData.set('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Groq Whisper transcription failed (${res.status}): ${errorText || res.statusText}`);
    }

    const data = await res.json();
    return data.text || '';
  }

  async extractTasks(transcript: string, staffList: { id: string; name: string }[]): Promise<ExtractionResult> {
    if (!this.apiKey) {
      // If DEMO_MODE is true and no API key is set, provide intelligent rule-based parsing so the demo doesn't fail
      if (process.env.DEMO_MODE === 'true') {
        return this.demoFallbackExtract(transcript, staffList);
      }
      throw new Error('AI_API_KEY is not configured in .env. Please set AI_API_KEY or use manual task creation.');
    }

    const staffNames = staffList.map(s => s.name).join(', ');
    const systemPrompt = `You are an AI ICU Operations Assistant for an ICU Command Center.
Your ONLY responsibility is to extract explicit operational tasks from the doctor's spoken transcript.
CRITICAL SAFETY AND CLINICAL BOUNDARIES:
1. You are NOT a medical diagnosis or treatment system.
2. DO NOT invent clinical diagnoses, medications, or clinical treatment recommendations.
3. NEVER invent tasks that were not explicitly spoken.
4. NEVER invent staff names. The ONLY valid staff members are: [${staffNames}].
   - Match spoken names leniently to known staff (e.g., "Anitha" -> "Nurse Anitha", "Priya" -> "Sister Priya", "Kumar" -> "Dr. Kumar", "Ramesh" -> "Ramesh", "Suresh" -> "Suresh").
   - If an instruction specifies someone not in this list or says "someone" or "anyone", set "assigneeName" to null and add a note to "uncertainItems".
5. Extract bed numbers as integers between 1 and 20 when mentioned (e.g. "Bed 8" -> 8). If no bed is mentioned, set bedNumber to null.
6. Infer priority only when urgency is explicitly indicated:
   - "stat", "urgently", "immediately", "emergency" -> "CRITICAL"
   - "high priority", "vital", "soon" -> "HIGH"
   - standard checks -> "MEDIUM"
   - routine/low urgency -> "LOW"
   - Default priority is "MEDIUM".
7. Split multiple instructions into separate task objects.
8. If an instruction is vague, incomplete, or ambiguous, flag it in "uncertainItems" instead of guessing.

Return ONLY a strict JSON object with this exact shape:
{
  "tasks": [
    {
      "title": "Check medication chart",
      "description": "Check medication chart for Bed 8 and confirm once completed",
      "assigneeName": "Nurse Anitha",
      "bedNumber": 8,
      "priority": "HIGH",
      "deadline": null,
      "confidence": 0.95
    }
  ],
  "uncertainItems": []
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Groq LLM extraction failed (${res.status}): ${errorText || res.statusText}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Groq returned empty response');
    }

    const parsedJson = JSON.parse(rawContent);
    const validated = extraction.parse(parsedJson);

    // Normalize assignee names against official staff list
    const normalizedTasks: ExtractedTask[] = validated.tasks.map(t => {
      let resolvedName = t.assigneeName;
      if (resolvedName) {
        const cleanTarget = resolvedName.toLowerCase();
        const found = staffList.find(s => {
          const sName = s.name.toLowerCase();
          const sLast = sName.split(' ').pop() || '';
          return (
            sName === cleanTarget ||
            sName.includes(cleanTarget) ||
            cleanTarget.includes(sLast)
          );
        });
        if (found) {
          resolvedName = found.name;
        }
      }
      return {
        ...t,
        assigneeName: resolvedName,
        bedNumber: t.bedNumber ? Number(t.bedNumber) : null,
      };
    });

    return {
      tasks: normalizedTasks,
      uncertainItems: validated.uncertainItems,
    };
  }

  // Safe fallback parser for demo environments when API key is not set
  demoFallbackExtract(transcript: string, staffList: { id: string; name: string }[]): ExtractionResult {
    const tasks: ExtractedTask[] = [];
    const uncertainItems: string[] = [];

    // Split sentences or clauses by periods, "and", commas
    const sentences = transcript.split(/\.|\band\b|;|\n/i).map(s => s.trim()).filter(Boolean);

    for (const sentence of sentences) {
      let matchedStaff: string | null = null;
      for (const s of staffList) {
        const lastName = s.name.split(' ').pop() || s.name;
        const re = new RegExp(`\\b(${s.name}|${lastName})\\b`, 'i');
        if (re.test(sentence)) {
          matchedStaff = s.name;
          break;
        }
      }

      const bedMatch = sentence.match(/bed\s*(\d{1,2})/i);
      const bedNumber = bedMatch ? parseInt(bedMatch[1], 10) : null;

      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      if (/urgent|stat|emergency|critical/i.test(sentence)) {
        priority = 'CRITICAL';
      } else if (/high|vital|soon/i.test(sentence)) {
        priority = 'HIGH';
      }

      // Clean title from spoken phrase
      let cleanTitle = sentence
        .replace(/^(please|can you|tell|ask)\s+/i, '')
        .replace(/\b(confirm when done|confirm once completed|let me know if there is anything abnormal)\b/gi, '')
        .trim();

      // Remove staff name prefix if present
      if (matchedStaff) {
        const lastName = matchedStaff.split(' ').pop() || matchedStaff;
        cleanTitle = cleanTitle.replace(new RegExp(`^(nurse|sister|dr\\.?\\s+)?(${lastName}|${matchedStaff})[,\\s]+`, 'i'), '');
      }

      // Capitalize first letter
      if (cleanTitle) {
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      } else {
        cleanTitle = 'Clinical Task';
      }

      if (!matchedStaff) {
        uncertainItems.push(`Unassigned action: "${sentence}". Please assign a staff member.`);
      }

      tasks.push({
        title: cleanTitle,
        description: sentence,
        assigneeName: matchedStaff,
        bedNumber: bedNumber && bedNumber <= 20 ? bedNumber : null,
        priority,
        deadline: null,
        confidence: matchedStaff ? 0.95 : 0.6,
      });
    }

    return { tasks, uncertainItems };
  }
}

export function getAIProvider(): AIProvider {
  return new GroqProvider();
}
