import { ulid } from 'ulid';
import { CourtCaseStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { InvalidStateTransitionError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import {
  NEXT_HEARING_MESSAGE,
  type AddProceedingInput,
  type ChangeCourtCaseStatusInput,
  type CreateCourtCaseInput,
} from '@/interfaces/http/schemas/legal';

/** Roles that run the Legal Section. */
export const LEGAL_ROLES: Role[] = [Role.ADMIN, Role.LEGAL_STAFF];

/**
 * Court Cases service (v4.4.1 §4.31).
 *
 *   PENDING ──▶ CLOSED        (final)
 *   PENDING ──▶ DISPOSED_OFF  (final)
 *
 * Proceedings can only be added while the case is PENDING. Same singleton
 * shape as RegistryService; problems surface as DomainErrors.
 */
export const courtCaseService = {
  async createCase(createdByUserId: string, input: CreateCourtCaseInput): Promise<{ id: string }> {
    const clash = await prisma.courtCase.findUnique({ where: { caseNumber: input.caseNumber }, select: { id: true } });
    if (clash) throw duplicateCaseNumber(input.caseNumber);
    if (input.relatedIndentId) {
      const indent = await prisma.indent.findUnique({ where: { id: input.relatedIndentId }, select: { id: true } });
      if (!indent) throw new ValidationError(`Indent not found: ${input.relatedIndentId}`, { relatedIndentId: 'not_found' });
    }
    if (input.relatedContractId) {
      const contract = await prisma.contract.findUnique({ where: { id: input.relatedContractId }, select: { id: true } });
      if (!contract) throw new ValidationError(`Contract not found: ${input.relatedContractId}`, { relatedContractId: 'not_found' });
    }

    const id = ulid();
    try {
      await prisma.courtCase.create({
        data: {
          id,
          caseNumber: input.caseNumber,
          court: input.court,
          party: input.party,
          counterParty: input.counterParty,
          relatedIndentId: input.relatedIndentId ?? null,
          relatedContractId: input.relatedContractId ?? null,
          filedOn: input.filedOn,
          documentKey: input.documentKey?.trim() ? input.documentKey.trim() : null,
          createdByUserId,
        },
      });
    } catch (err) {
      // Two users saving the same case number at once: the unique index catches it.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicateCaseNumber(input.caseNumber);
      throw err;
    }
    return { id };
  },

  async addProceeding(createdByUserId: string, courtCaseId: string, input: AddProceedingInput): Promise<{ id: string }> {
    const row = await prisma.courtCase.findUnique({ where: { id: courtCaseId }, select: { status: true } });
    if (!row) throw new NotFoundError('CourtCase', courtCaseId);
    if (row.status !== CourtCaseStatus.PENDING) {
      throw new ValidationError(`Court case is ${row.status} — no further changes`, { courtCaseId: 'locked' });
    }
    if (input.nextHearingDate && input.nextHearingDate.getTime() <= input.hearingDate.getTime()) {
      throw new ValidationError(NEXT_HEARING_MESSAGE, { nextHearingDate: 'not_after_hearing' });
    }

    const id = ulid();
    await prisma.courtProceeding.create({
      data: {
        id,
        courtCaseId,
        hearingDate: input.hearingDate,
        outcome: input.outcome,
        nextHearingDate: input.nextHearingDate ?? null,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        documentKey: input.documentKey?.trim() ? input.documentKey.trim() : null,
        createdByUserId,
      },
    });
    return { id };
  },

  /** PENDING → CLOSED | DISPOSED_OFF. Compare-and-set so a concurrent change cannot be overwritten. */
  async changeStatus(id: string, input: ChangeCourtCaseStatusInput): Promise<void> {
    const res = await prisma.courtCase.updateMany({
      where: { id, status: CourtCaseStatus.PENDING },
      data: { status: input.status, version: { increment: 1 } },
    });
    if (res.count === 1) return;
    const row = await prisma.courtCase.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('CourtCase', id);
    throw new InvalidStateTransitionError(row.status, `changeStatus:${input.status}`);
  },
};

function duplicateCaseNumber(caseNumber: string): ValidationError {
  return new ValidationError(`Case number ${caseNumber} is already used`, { caseNumber: 'duplicate' });
}
