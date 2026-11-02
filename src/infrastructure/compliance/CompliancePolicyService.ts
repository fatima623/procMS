import { ulid } from 'ulid';
import {
  BlacklistStatus,
  GrievanceStatus,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  DeclareBlacklistInput,
  RevokeBlacklistInput,
  CreateIntegrityPactInput,
  CounterSignIntegrityPactInput,
  FileGrievanceInput,
  DecideGrievanceInput,
  AppealGrievanceInput,
  WithdrawGrievanceInput,
} from '@/interfaces/http/schemas/compliance';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * CompliancePolicyService — one place that both:
 *   1. **Mutates** the three compliance-control stores (Blacklist, IntegrityPact,
 *      Grievance) through small admin operations, and
 *   2. **Queries** them for the guards other use-cases call:
 *        - `assertFirmNotBlacklisted` — guard IT invite, offer open, PR award.
 *        - `assertIntegrityPactPresentIfRequired` — guard award on indents > 10M.
 *        - `assertNoBlockingGrievance` — guard PR issue and contract award.
 *
 * The service is intentionally non-aggregate: these records *describe* reality
 * (an incident, a signed pact) rather than owning a lifecycle with many state
 * transitions, so a thin service with narrow invariants is a better fit than
 * a full DDD aggregate. The guard methods accept a Prisma `Db` so they can
 * participate in a caller's existing transaction (via UoW); the admin mutation
 * methods open their own transaction.
 */
export const compliancePolicy = {
  // --- Guards called by other use-cases ---------------------------------------

  /** Throws ValidationError if the firm has an ACTIVE blacklist row on `asOf`. */
  async assertFirmNotBlacklisted(firmId: string, asOf: Date, db: Db = defaultPrisma): Promise<void> {
    const row = await db.blacklist.findFirst({
      where: {
        firmId,
        status: BlacklistStatus.ACTIVE,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: asOf } }],
      },
      select: { id: true, ground: true, effectiveUntil: true },
    });
    if (row) {
      const until = row.effectiveUntil ? ` until ${row.effectiveUntil.toISOString().slice(0, 10)}` : ' (indefinite)';
      throw new ValidationError(
        `Firm is blacklisted on ${row.ground.replace(/_/g, ' ').toLowerCase()}${until}`,
      );
    }
  },

  /**
   * For procurements over PKR 10,000,000, PPRA Rule 7 requires an Integrity
   * Pact between the buyer and the awarded supplier. Throws when the indent
   * crosses that threshold and no pact row exists for (indentId, firmId).
   */
  async assertIntegrityPactPresentIfRequired(
    indentId: string,
    firmId: string,
    estimatedValueMinor: bigint,
    db: Db = defaultPrisma,
  ): Promise<void> {
    const INTEGRITY_PACT_THRESHOLD_MINOR = 10_000_000n * 10_000n; // 10M PKR → minor units
    if (estimatedValueMinor <= INTEGRITY_PACT_THRESHOLD_MINOR) return;
    const pact = await db.integrityPact.findUnique({
      where: { indentId_firmId: { indentId, firmId } },
      select: { id: true, signedByBuyerOn: true },
    });
    if (!pact) {
      throw new ValidationError(
        'Integrity Pact required (PPRA Rule 7) — indent value exceeds PKR 10,000,000 and no signed pact exists for this firm',
      );
    }
  },

  /**
   * PPRA Rules 48 & 50: no procurement contract may be awarded while a
   * pre-award grievance is pending for the indent. Throws when any
   * `PENDING` or `APPEALED` grievance exists for this indent in the
   * `PRE_AWARD` stage.
   */
  async assertNoBlockingGrievance(indentId: string, db: Db = defaultPrisma): Promise<void> {
    const row = await db.grievance.findFirst({
      where: {
        indentId,
        stage: 'PRE_AWARD',
        status: { in: [GrievanceStatus.PENDING, GrievanceStatus.APPEALED] },
      },
      select: { id: true, status: true, filedOn: true },
    });
    if (row) {
      throw new ValidationError(
        `Cannot award: grievance ${row.id} is ${row.status.toLowerCase()} on this indent (filed ${row.filedOn.toISOString().slice(0, 10)})`,
      );
    }
  },

  // --- Blacklist mutations ----------------------------------------------------

  async declareBlacklist(decidedByUserId: string, input: DeclareBlacklistInput): Promise<{ id: string }> {
    const firm = await defaultPrisma.firm.findUnique({ where: { id: input.firmId }, select: { id: true } });
    if (!firm) throw new NotFoundError('Firm', input.firmId);
    const id = ulid();
    await defaultPrisma.$transaction(async (tx) => {
      await tx.blacklist.create({
        data: {
          id,
          firmId: input.firmId,
          declaredOn: input.declaredOn,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil ?? null,
          ground: input.ground,
          reason: input.reason,
          decidedByUserId,
          documentKey: input.documentKey ?? null,
        },
      });
      await tx.firm.update({ where: { id: input.firmId }, data: { isBlacklisted: true } });
    });
    return { id };
  },

  async revokeBlacklist(id: string, revokedByUserId: string, input: RevokeBlacklistInput): Promise<void> {
    const row = await defaultPrisma.blacklist.findUnique({ where: { id }, select: { id: true, firmId: true, status: true } });
    if (!row) throw new NotFoundError('Blacklist', id);
    if (row.status !== BlacklistStatus.ACTIVE) {
      throw new ValidationError(`Blacklist ${id} is already ${row.status.toLowerCase()}`);
    }
    await defaultPrisma.$transaction(async (tx) => {
      await tx.blacklist.update({
        where: { id },
        data: {
          status: BlacklistStatus.REVOKED,
          revokedOn: input.revokedOn,
          revokedByUserId,
          revokedReason: input.revokedReason,
        },
      });
      // Re-check: any other ACTIVE row still blacklists the firm?
      const stillActive = await tx.blacklist.count({
        where: { firmId: row.firmId, status: BlacklistStatus.ACTIVE, id: { not: id } },
      });
      if (stillActive === 0) {
        await tx.firm.update({ where: { id: row.firmId }, data: { isBlacklisted: false } });
      }
    });
  },

  // --- Integrity Pact mutations ----------------------------------------------

  async createIntegrityPact(signedByBuyerUserId: string, input: CreateIntegrityPactInput): Promise<{ id: string }> {
    const [indent, firm] = await Promise.all([
      defaultPrisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } }),
      defaultPrisma.firm.findUnique({ where: { id: input.firmId }, select: { id: true } }),
    ]);
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    if (!firm) throw new NotFoundError('Firm', input.firmId);
    const existing = await defaultPrisma.integrityPact.findUnique({
      where: { indentId_firmId: { indentId: input.indentId, firmId: input.firmId } },
      select: { id: true },
    });
    if (existing) throw new ValidationError('Integrity Pact already exists for this indent + firm');
    const id = ulid();
    await defaultPrisma.integrityPact.create({
      data: {
        id,
        indentId: input.indentId,
        firmId: input.firmId,
        signedByBuyerUserId,
        signedByBuyerOn: input.signedByBuyerOn,
        signedBySupplierOn: input.signedBySupplierOn ?? null,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async counterSignIntegrityPact(id: string, input: CounterSignIntegrityPactInput): Promise<void> {
    const row = await defaultPrisma.integrityPact.findUnique({ where: { id }, select: { id: true, signedBySupplierOn: true } });
    if (!row) throw new NotFoundError('IntegrityPact', id);
    if (row.signedBySupplierOn) throw new ValidationError('Integrity Pact already counter-signed');
    await defaultPrisma.integrityPact.update({
      where: { id },
      data: { signedBySupplierOn: input.signedBySupplierOn },
    });
  },

  // --- Grievance mutations ---------------------------------------------------

  async fileGrievance(filedByUserId: string | null, input: FileGrievanceInput): Promise<{ id: string }> {
    const indent = await defaultPrisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } });
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    if (input.firmId) {
      const firm = await defaultPrisma.firm.findUnique({ where: { id: input.firmId }, select: { id: true } });
      if (!firm) throw new NotFoundError('Firm', input.firmId);
    }
    const id = ulid();
    await defaultPrisma.grievance.create({
      data: {
        id,
        indentId: input.indentId,
        firmId: input.firmId ?? null,
        filedByUserId,
        filedOn: input.filedOn,
        basis: input.basis,
        stage: input.stage,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async decideGrievance(id: string, input: DecideGrievanceInput): Promise<void> {
    const row = await defaultPrisma.grievance.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('Grievance', id);
    if (row.status !== GrievanceStatus.PENDING) {
      throw new ValidationError(`Grievance ${id} is already ${row.status.toLowerCase()}`);
    }
    await defaultPrisma.grievance.update({
      where: { id },
      data: {
        status: input.decision,
        grcDecisionOn: input.grcDecisionOn,
        grcDecisionText: input.grcDecisionText,
      },
    });
  },

  async appealGrievance(id: string, input: AppealGrievanceInput): Promise<void> {
    const row = await defaultPrisma.grievance.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('Grievance', id);
    if (row.status !== GrievanceStatus.REJECTED && row.status !== GrievanceStatus.UPHELD) {
      throw new ValidationError('Only a decided grievance can be appealed');
    }
    await defaultPrisma.grievance.update({
      where: { id },
      data: { status: GrievanceStatus.APPEALED, appealedToPPRAOn: input.appealedToPPRAOn },
    });
  },

  async withdrawGrievance(id: string, _input: WithdrawGrievanceInput): Promise<void> {
    const row = await defaultPrisma.grievance.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('Grievance', id);
    if (row.status !== GrievanceStatus.PENDING) {
      throw new ValidationError('Only a PENDING grievance can be withdrawn');
    }
    await defaultPrisma.grievance.update({
      where: { id },
      data: { status: GrievanceStatus.WITHDRAWN },
    });
  },
};
