import { z } from 'zod';

export const startTSRSchema = z.object({
  itPerformaId: z.string().length(26),
});
export type StartTSRInput = z.infer<typeof startTSRSchema>;

export const evaluateOfferSchema = z.object({
  technicalOfferId: z.string().length(26),
  verdict: z.enum(['ACCEPTED', 'REJECTED', 'NEEDS_QUERY']),
  remarks: z.string().max(10_000).optional(),
});
export type EvaluateOfferInput = z.infer<typeof evaluateOfferSchema>;

export const raiseQuerySchema = z.object({
  firmId: z.string().length(26),
  question: z.string().min(1).max(10_000),
});
export type RaiseQueryInput = z.infer<typeof raiseQuerySchema>;

export const answerQuerySchema = z.object({
  queryId: z.string().length(26),
  response: z.string().min(1).max(10_000),
});
export type AnswerQueryInput = z.infer<typeof answerQuerySchema>;

export const completeTSRSchema = z.object({
  summary: z.string().min(1).max(10_000),
});
export type CompleteTSRInput = z.infer<typeof completeTSRSchema>;
