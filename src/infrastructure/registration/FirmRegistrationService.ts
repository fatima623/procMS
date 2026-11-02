import { ulid } from 'ulid';
import {
  FirmRegistrationStatus,
  type FirmRegistrationCategory,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  SubmitFirmRegistrationInput,
  ApproveFirmRegistrationInput,
  RejectFirmRegistrationInput,
  RevokeFirmRegistrationInput,
} from '@/interfaces/http/schemas/firmRegistration';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * FirmRegistrationService — pre-qualification lifecycle for firms
 * (PPRA Rules 15–16; DPP&I-35 Ch XXVI).
 *
 * Lifecycle: submit → approve (issues the certificate with a validity
 * window) OR reject. Later: revoke; or the validity window simply lapses
 * (an EXPIRED row is derived at read time by checking `validUntil`).
 *
 * `assertFirmPreQualified` is the guard the IT invite path calls — it
 * accepts the firm iff at least one APPROVED non-revoked row exists for
 * (firmId, category) whose validity window covers `asOf`.
 */
export const firmRegistrationService = {
  // --- Guard called by other use-cases ----------------------------------------

  /**
   * Throws ValidationError when the firm has no APPROVED registration for the
   * given category whose validity window covers `asOf`. Pass `category = null`
   * to require ANY active registration (lenient check — accepts any category).
   */
  async assertFirmPreQualified(
    firmId: string,
    category: FirmRegistrationCategory | null,
    asOf: Date,
    db: Db = defaultPrisma,
  ): Promise<void> {
    const where: Prisma.FirmRegistrationWhereInput = {
      firmId,
      status: FirmRegistrationStatus.APPROVED,
      issuedOn: { lte: asOf },
      OR: [{ validUntil: null }, { validUntil: { gte: asOf } }],
    };
    if (category) where.category = category;
    const row = await db.firmRegistration.findFirst({ where, select: { id: true, category: true, validUntil: true } });
    if (!row) {
      throw new ValidationError(
        category
          ? `Firm has no APPROVED registration for ${category} that is valid on ${asOf.toISOString().slice(0, 10)}`
          : `Firm has no APPROVED registration valid on ${asOf.toISOString().slice(0, 10)}`,
      );
    }
  },

  // --- Mutations --------------------------------------------------------------

  async submit(input: SubmitFirmRegistrationInput): Promise<{ id: string }> {
    const firm = await defaultPrisma.firm.findUnique({ where: { id: input.firmId }, select: { id: true } });
    if (!firm) throw new NotFoundError('Firm', input.firmId);
    const id = ulid();
    await defaultPrisma.firmRegistration.create({
      data: {
        id,
        firmId: input.firmId,
        category: input.category,
        submittedOn: input.submittedOn,
        certificateKey: input.certificateKey ?? null,
      },
    });
    return { id };
  },

  async approve(id: string, reviewedByUserId: string, input: ApproveFirmRegistrationInput): Promise<void> {
    const row = await defaultPrisma.firmRegistration.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FirmRegistration', id);
    if (row.status !== FirmRegistrationStatus.PENDING) {
      throw new ValidationError(`Registration ${id} is already ${row.status.toLowerCase()}`);
    }
    if (input.validUntil.getTime() <= input.issuedOn.getTime()) {
      throw new ValidationError('validUntil must be after issuedOn');
    }
    await defaultPrisma.firmRegistration.update({
      where: { id },
      data: {
        status: FirmRegistrationStatus.APPROVED,
        issuedOn: input.issuedOn,
        validUntil: input.validUntil,
        reviewedByUserId,
        reviewNotes: input.reviewNotes ?? null,
        certificateKey: input.certificateKey ?? undefined,
      },
    });
  },

  async reject(id: string, reviewedByUserId: string, input: RejectFirmRegistrationInput): Promise<void> {
    const row = await defaultPrisma.firmRegistration.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FirmRegistration', id);
    if (row.status !== FirmRegistrationStatus.PENDING) {
      throw new ValidationError(`Registration ${id} is already ${row.status.toLowerCase()}`);
    }
    await defaultPrisma.firmRegistration.update({
      where: { id },
      data: {
        status: FirmRegistrationStatus.REJECTED,
        reviewedByUserId,
        reviewNotes: input.reviewNotes,
      },
    });
  },

  async revoke(id: string, revokedByUserId: string, input: RevokeFirmRegistrationInput): Promise<void> {
    const row = await defaultPrisma.firmRegistration.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FirmRegistration', id);
    if (row.status !== FirmRegistrationStatus.APPROVED) {
      throw new ValidationError(`Only an APPROVED registration can be revoked (currently ${row.status})`);
    }
    await defaultPrisma.firmRegistration.update({
      where: { id },
      data: {
        status: FirmRegistrationStatus.REVOKED,
        revokedOn: input.revokedOn,
        revokedReason: input.revokedReason,
        // revokedByUserId is captured via reviewedByUserId audit field above; we store it in reviewNotes if the schema evolves
      },
    });
    void revokedByUserId; // for future audit-log wiring
  },
};
