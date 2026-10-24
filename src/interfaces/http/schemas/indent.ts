import { z } from 'zod';

const indentItemSchema = z.object({
  lineNo: z.number().int().min(1),
  itemCode: z.string().max(80).optional(),
  description: z.string().min(1).max(1000),
  specifications: z.record(z.unknown()).optional(),
  quantity: z.number().positive(),
  uom: z.string().min(1).max(20),
  estimatedUnitPriceMinor: z.string().regex(/^\d+$/, 'must be a non-negative integer string'),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
});

export const createIndentSchema = z.object({
  subject: z.string().min(1).max(500),
  justification: z.string().max(10_000).optional(),
  type: z.enum(['NORMAL', 'PROPRIETY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  estimatedValueMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  fiscalYearId: z.string().length(26),
  budgetHeadId: z.string().length(26),
  items: z.array(indentItemSchema).min(1).max(500),
});

export type CreateIndentInput = z.infer<typeof createIndentSchema>;

export const listIndentsQuerySchema = z.object({
  status: z.string().optional(),            // comma-separated enum values
  indenterId: z.string().length(26).optional(),
  sectionId: z.string().length(26).optional(),
  fiscalYearId: z.string().length(26).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type ListIndentsQuery = z.infer<typeof listIndentsQuerySchema>;
