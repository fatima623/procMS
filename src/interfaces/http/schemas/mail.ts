import { z } from 'zod';

// Mail Box — internal user-to-user messaging (v4.4.1 §4.4, manual pp.13–18).

export const SUBJECT_MAX = 200;

export const sendMessageSchema = z.object({
  toUserId: z.string().min(1).max(26),
  subject: z.string().trim().min(1).max(SUBJECT_MAX),
  body: z.string().trim().min(1).max(20_000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const replyMessageSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
});
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;

/** "Re: <subject>" without stacking — "Re: Re: x" collapses to "Re: x". */
export function replySubject(subject: string): string {
  const base = subject.replace(/^\s*(re:\s*)+/i, '').trim();
  return `Re: ${base}`.slice(0, SUBJECT_MAX);
}
