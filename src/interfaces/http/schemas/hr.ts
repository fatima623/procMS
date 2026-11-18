import { z } from 'zod';
import { LeaveKind } from '@prisma/client';

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v));

const bigintLike = z
  .union([z.string().min(1), z.number(), z.bigint()])
  .transform((v) => BigInt(v));

export const createEmployeeSchema = z.object({
  personnelNumber: z.string().min(1).max(50),
  rank:            z.string().min(1).max(100),
  designation:     z.string().min(1).max(100),
  section:         z.string().min(1).max(100),
  dateOfJoining:   dateStr,
  dateOfBirth:     dateStr,
  bloodGroup:      z.string().max(10).optional(),
  contact:         z.string().max(50).optional(),
  maritalStatus:   z.string().max(20).optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const createServiceRecordSchema = z.object({
  postingFrom: dateStr,
  postingTo:   dateStr.optional(),
  section:     z.string().min(1).max(100),
  remarks:     z.string().max(500).optional(),
});
export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;

export const createLeaveSchema = z.object({
  kind:     z.nativeEnum(LeaveKind),
  fromDate: dateStr,
  toDate:   dateStr,
  remarks:  z.string().max(500).optional(),
});
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const createHouseHiringSchema = z.object({
  address:         z.string().min(1).max(500),
  landlord:        z.string().min(1).max(100),
  monthlyRentMinor: bigintLike,
  currency:        z.string().max(3).default('PKR'),
  hireStart:       dateStr,
  hireEnd:         dateStr.optional(),
});
export type CreateHouseHiringInput = z.infer<typeof createHouseHiringSchema>;

export const createDisciplinarySchema = z.object({
  kind:      z.string().min(1).max(100),
  issuedOn:  dateStr,
  authority: z.string().min(1).max(100),
  decision:  z.string().min(1),
  remarks:   z.string().max(500).optional(),
});
export type CreateDisciplinaryInput = z.infer<typeof createDisciplinarySchema>;

export const bulkAttendanceSchema = z.object({
  date:        dateStr,
  employeeIds: z.array(z.string().min(1)).min(1),
  kind:        z.nativeEnum(LeaveKind),
  remarks:     z.string().max(500).optional(),
});
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
