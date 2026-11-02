import { BlacklistStatus, GrievanceStatus, IndentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

/**
 * Read-side projections for the three compliance-control pages
 * (Blacklist / Integrity Pact / Grievance) plus the firm/indent pickers
 * their creation forms depend on.
 */

// --- Blacklists ---------------------------------------------------------------

export interface BlacklistRow {
  readonly id: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly declaredOn: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly ground: string;
  readonly reason: string;
  readonly status: string;
  readonly revokedOn: string | null;
}

export async function listBlacklists(): Promise<readonly BlacklistRow[]> {
  const rows = await prisma.blacklist.findMany({
    orderBy: { declaredOn: 'desc' },
    include: { firm: { select: { id: true, name: true } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    firmId: r.firm.id,
    firmName: r.firm.name,
    declaredOn: r.declaredOn.toISOString(),
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveUntil: r.effectiveUntil?.toISOString() ?? null,
    ground: r.ground,
    reason: r.reason,
    status: r.status,
    revokedOn: r.revokedOn?.toISOString() ?? null,
  }));
}

export async function countActiveBlacklists(): Promise<number> {
  return prisma.blacklist.count({ where: { status: BlacklistStatus.ACTIVE } });
}

// --- Integrity pacts ----------------------------------------------------------

export interface IntegrityPactRow {
  readonly id: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly signedByBuyerOn: string;
  readonly signedBySupplierOn: string | null;
}

export async function listIntegrityPacts(): Promise<readonly IntegrityPactRow[]> {
  const rows = await prisma.integrityPact.findMany({
    orderBy: { signedByBuyerOn: 'desc' },
    include: {
      indent: { select: { id: true, subject: true } },
      firm: { select: { id: true, name: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    indentId: r.indent.id,
    indentSubject: r.indent.subject,
    firmId: r.firm.id,
    firmName: r.firm.name,
    signedByBuyerOn: r.signedByBuyerOn.toISOString(),
    signedBySupplierOn: r.signedBySupplierOn?.toISOString() ?? null,
  }));
}

// --- Grievances --------------------------------------------------------------

export interface GrievanceRow {
  readonly id: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string | null;
  readonly firmName: string | null;
  readonly stage: string;
  readonly status: string;
  readonly filedOn: string;
  readonly basis: string;
  readonly grcDecisionOn: string | null;
  readonly appealedToPPRAOn: string | null;
}

export async function listGrievances(): Promise<readonly GrievanceRow[]> {
  const rows = await prisma.grievance.findMany({
    orderBy: { filedOn: 'desc' },
    include: {
      indent: { select: { id: true, subject: true } },
      firm: { select: { id: true, name: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    indentId: r.indent.id,
    indentSubject: r.indent.subject,
    firmId: r.firm?.id ?? null,
    firmName: r.firm?.name ?? null,
    stage: r.stage,
    status: r.status,
    filedOn: r.filedOn.toISOString(),
    basis: r.basis,
    grcDecisionOn: r.grcDecisionOn?.toISOString() ?? null,
    appealedToPPRAOn: r.appealedToPPRAOn?.toISOString() ?? null,
  }));
}

export async function countPendingGrievances(): Promise<number> {
  return prisma.grievance.count({ where: { status: GrievanceStatus.PENDING } });
}

// --- Pickers for create-forms -------------------------------------------------

export interface FirmPick {
  readonly id: string;
  readonly name: string;
  readonly isBlacklisted: boolean;
}

export async function listFirmsForPicker(): Promise<readonly FirmPick[]> {
  const rows = await prisma.firm.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, isBlacklisted: true },
    take: 500,
  });
  return rows;
}

export interface IndentPick {
  readonly id: string;
  readonly indentNumber: string;
  readonly subject: string;
  readonly status: string;
}

/** Any live indent (not DRAFT, not terminal). */
export async function listLiveIndentsForPicker(): Promise<readonly IndentPick[]> {
  const rows = await prisma.indent.findMany({
    where: {
      status: {
        notIn: [
          IndentStatus.DRAFT,
          IndentStatus.CLOSED,
          IndentStatus.CANCELLED,
          IndentStatus.INDENT_REJECTED,
          IndentStatus.BUDGET_REJECTED,
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, indentNumber: true, subject: true, status: true },
    take: 200,
  });
  return rows;
}
