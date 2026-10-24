import { z } from 'zod';
import { Role, SectionKind } from '@prisma/client';

// ===== Users =====
export const createUserSchema = z.object({
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(120),
  password: z.string().min(10).max(200),
  rank: z.string().max(60).optional(),
  roles: z.array(z.nativeEnum(Role)).min(1),
  sectionIds: z.array(z.string().length(26)).default([]),
  firmId: z.string().length(26).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  rank: z.string().max(60).nullable().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.nativeEnum(Role)).min(1).optional(),
  sectionIds: z.array(z.string().length(26)).optional(),
  firmId: z.string().length(26).nullable().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(10).max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ===== Sections =====
export const upsertSectionSchema = z.object({
  code: z.string().min(1).max(40).regex(/^[A-Z0-9][A-Z0-9-]*$/, 'uppercase + digits + hyphens'),
  name: z.string().min(1).max(160),
  kind: z.nativeEnum(SectionKind),
  parentId: z.string().length(26).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpsertSectionInput = z.infer<typeof upsertSectionSchema>;

// ===== Firms =====
export const upsertFirmSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(255),
  ntn: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(60).optional(),
  isActive: z.boolean().optional(),
  isBlacklisted: z.boolean().optional(),
});
export type UpsertFirmInput = z.infer<typeof upsertFirmSchema>;

// ===== Fiscal years =====
export const upsertFiscalYearSchema = z.object({
  label: z.string().min(1).max(20),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  isActive: z.boolean().optional(),
});
export type UpsertFiscalYearInput = z.infer<typeof upsertFiscalYearSchema>;

// ===== Budget heads =====
export const upsertBudgetHeadSchema = z.object({
  code: z.string().min(1).max(40).regex(/^[A-Z0-9][A-Z0-9-]*$/),
  description: z.string().min(1).max(255),
  isActive: z.boolean().optional(),
});
export type UpsertBudgetHeadInput = z.infer<typeof upsertBudgetHeadSchema>;

// ===== Budget allocations =====
export const upsertBudgetAllocationSchema = z.object({
  fiscalYearId: z.string().length(26),
  budgetHeadId: z.string().length(26),
  sectionId: z.string().length(26).nullable().optional(),
  allocated: z.string().regex(/^\d+(\.\d{1,4})?$/, 'decimal, up to 4dp'),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
});
export type UpsertBudgetAllocationInput = z.infer<typeof upsertBudgetAllocationSchema>;
