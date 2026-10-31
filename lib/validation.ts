import { z } from 'zod';

export const taskInput = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional().default(''),
  assignedToId: z.string().min(1, 'Assignee is required'),
  bedNumber: z.number().int().min(1).max(20).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  deadline: z.string().datetime().nullable().optional(),
  source: z.enum(['VOICE', 'MANUAL', 'SYSTEM']).default('MANUAL'),
  voiceSessionId: z.string().nullable().optional(),
});

export const extraction = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().default(''),
      assigneeName: z.string().nullable(),
      bedNumber: z.union([z.number().int(), z.string()]).nullable().transform((val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      }),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
      deadline: z.string().nullable().default(null),
      confidence: z.number().min(0).max(1).default(0.9),
    })
  ),
  uncertainItems: z.array(z.string()).default([]),
});

export const respondInput = z.object({
  answer: z.enum(['YES', 'NO']),
  reason: z.string().optional(),
});

export const reassignInput = z.object({
  userId: z.string().min(1, 'Target staff ID is required'),
  reason: z.string().optional(),
});

export const escalationConfigInput = z.object({
  firstSeconds: z.number().int().min(5),
  secondSeconds: z.number().int().min(10),
  escalateSeconds: z.number().int().min(15),
});

export const demoActionInput = z.object({
  action: z.enum([
    'SIMULATE_YES',
    'SIMULATE_NO',
    'SIMULATE_DELAY',
    'TRIGGER_REMINDER',
    'TRIGGER_ESCALATION',
    'RESET_DEMO',
  ]),
  taskId: z.string().optional(),
  userId: z.string().optional(),
  reason: z.string().optional(),
});
