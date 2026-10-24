import { z } from 'zod';

export const createITPerformaSchema = z.object({
  indentId: z.string().length(26),
  reference: z.string().min(5).max(60),
  checklist: z.record(z.unknown()).optional(),
  invitedFirmIds: z.array(z.string().length(26)).min(1).max(200),
});

export type CreateITPerformaInput = z.infer<typeof createITPerformaSchema>;

export const dispatchITSchema = z.object({
  closingAt: z.string().datetime(),
});

export type DispatchITInput = z.infer<typeof dispatchITSchema>;
