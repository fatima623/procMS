import { z } from 'zod';
import { InsuranceKind, ShipmentMode } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));
const percent = z.union([z.string().min(1), z.number()]).transform((v) => String(v));

export const createInsuranceSchema = z.object({
  contractId: z.string().min(1),
  kind: z.nativeEnum(InsuranceKind),
  policyNumber: z.string().min(1).max(60),
  insurer: z.string().min(1).max(255),
  coverFromDate: dateLike,
  coverToDate: dateLike,
  premium: money,
  currency: z.string().length(3).default('PKR'),
  documentKey: z.string().max(500).optional(),
});
export type CreateInsuranceInput = z.infer<typeof createInsuranceSchema>;

export const createShipmentSchema = z.object({
  contractId: z.string().min(1),
  invoiceId: z.string().min(1).optional(),
  mode: z.nativeEnum(ShipmentMode),
  blAwbNumber: z.string().min(1).max(80),
  dispatchedOn: dateLike,
  receivedOn: dateLike.optional(),
  freightForwarder: z.string().max(255).optional(),
  originPort: z.string().max(120).optional(),
  destinationPort: z.string().max(120).optional(),
  documentKey: z.string().max(500).optional(),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const markShipmentReceivedSchema = z.object({
  receivedOn: dateLike,
});
export type MarkShipmentReceivedInput = z.infer<typeof markShipmentReceivedSchema>;

export const createEndUserCertificateSchema = z.object({
  contractId: z.string().min(1),
  issuedOn: dateLike,
  endUserOrganisation: z.string().min(1).max(255),
  controlledGoodsDesc: z.string().min(5).max(5000),
  documentKey: z.string().max(500).optional(),
});
export type CreateEndUserCertificateInput = z.infer<typeof createEndUserCertificateSchema>;

export const createAgentCommissionSchema = z.object({
  contractId: z.string().min(1),
  agentName: z.string().min(1).max(255),
  agentFirmId: z.string().min(1).optional(),
  percent,
  amount: money,
  currency: z.string().length(3).default('PKR'),
  disclosedOn: dateLike,
  documentKey: z.string().max(500).optional(),
});
export type CreateAgentCommissionInput = z.infer<typeof createAgentCommissionSchema>;

export const approveAgentCommissionSchema = z.object({
  approvedOn: dateLike,
});
export type ApproveAgentCommissionInput = z.infer<typeof approveAgentCommissionSchema>;
