import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canTransition, transitions } from '../lib/tasks/task-engine';
import { extraction, taskInput, respondInput, reassignInput, escalationConfigInput, demoActionInput } from '../lib/validation';
import { MockWhatsAppProvider } from '../lib/whatsapp/provider';
import { GroqProvider } from '../lib/ai/provider';

describe('1. Task State Machine Transitions', () => {
  it('allows PENDING -> IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED, OVERDUE', () => {
    expect(canTransition('PENDING', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('PENDING', 'COMPLETED')).toBe(true);
    expect(canTransition('PENDING', 'BLOCKED')).toBe(true);
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PENDING', 'OVERDUE')).toBe(true);
  });

  it('allows IN_PROGRESS -> COMPLETED, BLOCKED, OVERDUE', () => {
    expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'BLOCKED')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'OVERDUE')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'PENDING')).toBe(false);
  });

  it('allows BLOCKED -> PENDING (upon reassignment) or CANCELLED', () => {
    expect(canTransition('BLOCKED', 'PENDING')).toBe(true);
    expect(canTransition('BLOCKED', 'CANCELLED')).toBe(true);
    expect(canTransition('BLOCKED', 'COMPLETED')).toBe(false);
  });

  it('allows OVERDUE -> COMPLETED, BLOCKED, CANCELLED', () => {
    expect(canTransition('OVERDUE', 'COMPLETED')).toBe(true);
    expect(canTransition('OVERDUE', 'BLOCKED')).toBe(true);
    expect(canTransition('OVERDUE', 'CANCELLED')).toBe(true);
    expect(canTransition('OVERDUE', 'IN_PROGRESS')).toBe(false);
  });

  it('strictly prevents any transition out of COMPLETED or CANCELLED terminal states', () => {
    expect(transitions.COMPLETED.length).toBe(0);
    expect(transitions.CANCELLED.length).toBe(0);
    expect(canTransition('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransition('COMPLETED', 'BLOCKED')).toBe(false);
    expect(canTransition('CANCELLED', 'PENDING')).toBe(false);
  });
});

describe('2. Zod Validation Schemas', () => {
  it('validates valid task creation inputs', () => {
    const valid = {
      title: 'Check ventilator PEEP on Bed 12',
      assignedToId: 'usr-123',
      bedNumber: 12,
      priority: 'HIGH',
    };
    const res = taskInput.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects task without title or assignee', () => {
    expect(taskInput.safeParse({ assignedToId: 'usr-123' }).success).toBe(false);
    expect(taskInput.safeParse({ title: 'Check' }).success).toBe(false);
  });

  it('validates AI task extraction output structure', () => {
    const aiOutput = {
      tasks: [
        {
          title: 'Review arterial blood gas report',
          description: 'PaO2 and pH inspection',
          assigneeName: 'Nurse Anitha',
          bedNumber: 8,
          priority: 'HIGH',
          deadline: null,
          confidence: 0.95,
        },
      ],
      uncertainItems: ['Check bedside pump'],
    };
    const res = extraction.safeParse(aiOutput);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.tasks[0].title).toBe('Review arterial blood gas report');
      expect(res.data.tasks[0].bedNumber).toBe(8);
      expect(res.data.tasks[0].priority).toBe('HIGH');
    }
  });

  it('handles string bedNumber conversion cleanly in extraction schema', () => {
    const raw = {
      tasks: [
        {
          title: 'Check Bed 14',
          description: '',
          assigneeName: 'Ramesh',
          bedNumber: '14',
          priority: 'CRITICAL',
          deadline: null,
          confidence: 0.9,
        },
      ],
      uncertainItems: [],
    };
    const parsed = extraction.parse(raw);
    expect(parsed.tasks[0].bedNumber).toBe(14);
  });

  it('validates staff response input (YES / NO)', () => {
    expect(respondInput.safeParse({ answer: 'YES' }).success).toBe(true);
    expect(respondInput.safeParse({ answer: 'NO', reason: 'Crash cart alarm' }).success).toBe(true);
    expect(respondInput.safeParse({ answer: 'MAYBE' }).success).toBe(false);
  });

  it('validates reassignment and demo inputs', () => {
    expect(reassignInput.safeParse({ userId: 'usr-456' }).success).toBe(true);
    expect(reassignInput.safeParse({}).success).toBe(false);

    expect(demoActionInput.safeParse({ action: 'SIMULATE_YES' }).success).toBe(true);
    expect(demoActionInput.safeParse({ action: 'INVALID_ACTION' }).success).toBe(false);

    expect(escalationConfigInput.safeParse({ firstSeconds: 900, secondSeconds: 1800, escalateSeconds: 2700 }).success).toBe(true);
    expect(escalationConfigInput.safeParse({ firstSeconds: 2, secondSeconds: 1800, escalateSeconds: 2700 }).success).toBe(false);
  });
});

describe('3. Mock WhatsApp Provider Abstraction', () => {
  it('formats task messages properly with Bed and Priority indicators', async () => {
    const provider = new MockWhatsAppProvider();
    // Spy on internal sendMessage
    const sendSpy = vi.spyOn(provider, 'sendMessage').mockResolvedValue({ id: 'msg-1' } as any);

    await provider.sendTaskMessage({
      userId: 'usr-anitha',
      taskId: 'task-101',
      taskTitle: 'Check medication chart',
      bedNumber: 8,
      priority: 'HIGH',
      assignedByName: 'Dr. Arjun',
    });

    expect(sendSpy).toHaveBeenCalledOnce();
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs.userId).toBe('usr-anitha');
    expect(callArgs.text).toContain('Bed 8');
    expect(callArgs.text).toContain('Check medication chart');
    expect(callArgs.text).toContain('Reply *YES* when completed or *NO* if unable');
  });

  it('formats reminder messages with level indicator', async () => {
    const provider = new MockWhatsAppProvider();
    const sendSpy = vi.spyOn(provider, 'sendMessage').mockResolvedValue({ id: 'msg-2' } as any);

    await provider.sendReminder({
      userId: 'usr-ramesh',
      taskId: 'task-102',
      taskTitle: 'Check ventilator settings',
      bedNumber: 12,
      level: 1,
    });

    expect(sendSpy).toHaveBeenCalledOnce();
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs.text).toContain('Reminder #1');
    expect(callArgs.text).toContain('Bed 12');
  });

  it('formats escalation alert sent to consultant', async () => {
    const provider = new MockWhatsAppProvider();
    const sendSpy = vi.spyOn(provider, 'sendMessage').mockResolvedValue({ id: 'msg-3' } as any);

    await provider.sendEscalation({
      consultantId: 'usr-consultant',
      taskId: 'task-103',
      taskTitle: 'Arterial blood report review',
      assignedToName: 'Dr. Kumar',
      bedNumber: 15,
      elapsedMinutes: 45,
    });

    expect(sendSpy).toHaveBeenCalledOnce();
    const callArgs = sendSpy.mock.calls[0][0];
    expect(callArgs.userId).toBe('usr-consultant');
    expect(callArgs.text).toContain('ESCALATION ALERT');
    expect(callArgs.text).toContain('45 minutes');
  });
});

describe('4. AI Fallback Extraction Engine', () => {
  it('correctly splits multi-staff verbal command into structured tasks in demo mode', () => {
    const provider = new GroqProvider();
    const staffList = [
      { id: '1', name: 'Nurse Anitha' },
      { id: '2', name: 'Ramesh' },
      { id: '3', name: 'Sister Priya' },
    ];
    const transcript =
      'Nurse Anitha check the medication chart for Bed 8. Ramesh check ventilator settings for Bed 12. Sister Priya make sure emergency trolley is stocked.';

    const result = provider.demoFallbackExtract(transcript, staffList);

    expect(result.tasks.length).toBe(3);
    expect(result.tasks[0].assigneeName).toBe('Nurse Anitha');
    expect(result.tasks[0].bedNumber).toBe(8);
    expect(result.tasks[1].assigneeName).toBe('Ramesh');
    expect(result.tasks[1].bedNumber).toBe(12);
    expect(result.tasks[2].assigneeName).toBe('Sister Priya');
  });

  it('flags unassigned instructions in uncertainItems instead of guessing', () => {
    const provider = new GroqProvider();
    const staffList = [{ id: '1', name: 'Nurse Anitha' }];
    const transcript = 'Someone please check the monitor alarm in Bed 5 immediately.';

    const result = provider.demoFallbackExtract(transcript, staffList);
    expect(result.tasks[0].assigneeName).toBeNull();
    expect(result.uncertainItems.length).toBeGreaterThan(0);
    expect(result.uncertainItems[0]).toContain('Unassigned action');
  });
});
