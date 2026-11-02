import { ulid } from 'ulid';
import {
  FMSStatus,
  DisposalStatus,
  AppealStatus,
  GrievanceStatus,
} from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  OpenFMSInput, RecordLOAInput, AcceptLOAInput, CompleteFMSDeliveryInput, CloseFMSInput, CancelFMSInput,
  CreateDisposalInput, OpenDisposalForBidsInput, AwardLotInput, CompleteDisposalInput, CancelDisposalInput,
  FileAppealInput, DecideAppealInput, WithdrawAppealInput,
} from '@/interfaces/http/schemas/specialCases';

export const fmsService = {
  async open(input: OpenFMSInput): Promise<{ id: string }> {
    const indent = await prisma.indent.findUnique({ where: { id: input.indentId }, select: { id: true } });
    if (!indent) throw new NotFoundError('Indent', input.indentId);
    const existing = await prisma.fMSCase.findUnique({ where: { indentId: input.indentId }, select: { id: true } });
    if (existing) throw new ValidationError(`Indent ${input.indentId} already has an FMS case`);
    const id = ulid();
    await prisma.fMSCase.create({
      data: {
        id,
        indentId: input.indentId,
        caseNumber: input.caseNumber,
        foreignAuthority: input.foreignAuthority,
        lorSubmittedOn: input.lorSubmittedOn,
        currency: input.currency,
        notes: input.notes ?? null,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async recordLOA(id: string, input: RecordLOAInput): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status !== FMSStatus.LOR_SUBMITTED) {
      throw new ValidationError(`FMS case must be LOR_SUBMITTED to record LOA (currently ${row.status})`);
    }
    await prisma.fMSCase.update({
      where: { id },
      data: {
        loaReceivedOn: input.loaReceivedOn,
        loaValue: input.loaValue,
        currency: input.currency,
        deliveryExpectedBy: input.deliveryExpectedBy ?? undefined,
        status: FMSStatus.LOA_RECEIVED,
      },
    });
  },

  async acceptLOA(id: string, input: AcceptLOAInput): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status !== FMSStatus.LOA_RECEIVED) {
      throw new ValidationError(`FMS case must be LOA_RECEIVED to accept (currently ${row.status})`);
    }
    await prisma.fMSCase.update({
      where: { id },
      data: { loaAcceptedOn: input.loaAcceptedOn, status: FMSStatus.LOA_ACCEPTED },
    });
  },

  async enterImplementation(id: string): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status !== FMSStatus.LOA_ACCEPTED) {
      throw new ValidationError(`FMS case must be LOA_ACCEPTED to enter implementation (currently ${row.status})`);
    }
    await prisma.fMSCase.update({ where: { id }, data: { status: FMSStatus.IN_IMPLEMENTATION } });
  },

  async completeDelivery(id: string, input: CompleteFMSDeliveryInput): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status !== FMSStatus.IN_IMPLEMENTATION && row.status !== FMSStatus.LOA_ACCEPTED) {
      throw new ValidationError(`FMS case must be in implementation to complete delivery (currently ${row.status})`);
    }
    await prisma.fMSCase.update({ where: { id }, data: { deliveryCompletedOn: input.deliveryCompletedOn } });
  },

  async close(id: string, input: CloseFMSInput): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status === FMSStatus.CLOSED || row.status === FMSStatus.CANCELLED) {
      throw new ValidationError(`FMS case is already ${row.status}`);
    }
    await prisma.fMSCase.update({ where: { id }, data: { status: FMSStatus.CLOSED, closedOn: input.closedOn } });
  },

  async cancel(id: string, input: CancelFMSInput): Promise<void> {
    const row = await prisma.fMSCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FMSCase', id);
    if (row.status === FMSStatus.CLOSED || row.status === FMSStatus.CANCELLED) {
      throw new ValidationError(`FMS case is already ${row.status}`);
    }
    await prisma.fMSCase.update({
      where: { id },
      data: { status: FMSStatus.CANCELLED, closedOn: input.cancelledOn, cancelledReason: input.cancelledReason },
    });
  },
};

export const disposalService = {
  async create(input: CreateDisposalInput): Promise<{ id: string }> {
    if (input.bidOpensOn && input.bidClosesOn && input.bidClosesOn.getTime() <= input.bidOpensOn.getTime()) {
      throw new ValidationError('bidClosesOn must be after bidOpensOn');
    }
    const existing = await prisma.disposalCase.findUnique({ where: { reference: input.reference }, select: { id: true } });
    if (existing) throw new ValidationError(`Disposal reference ${input.reference} already in use`);
    const lotNumbers = input.lots.map((l) => l.lotNumber);
    if (new Set(lotNumbers).size !== lotNumbers.length) {
      throw new ValidationError('Lot numbers must be unique within a case');
    }
    const id = ulid();
    await prisma.disposalCase.create({
      data: {
        id,
        reference: input.reference,
        kind: input.kind,
        description: input.description,
        initiatedOn: input.initiatedOn,
        currency: input.currency,
        bidOpensOn: input.bidOpensOn ?? null,
        bidClosesOn: input.bidClosesOn ?? null,
        lots: {
          create: input.lots.map((lot) => ({
            id: ulid(),
            lotNumber: lot.lotNumber,
            description: lot.description,
            reservePrice: lot.reservePrice ?? null,
            currency: lot.currency,
          })),
        },
      },
    });
    return { id };
  },

  async openForBids(id: string, input: OpenDisposalForBidsInput): Promise<void> {
    const row = await prisma.disposalCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('DisposalCase', id);
    if (row.status !== DisposalStatus.PLANNED) {
      throw new ValidationError(`Disposal must be PLANNED to open (currently ${row.status})`);
    }
    if (input.bidClosesOn.getTime() <= input.bidOpensOn.getTime()) {
      throw new ValidationError('bidClosesOn must be after bidOpensOn');
    }
    await prisma.disposalCase.update({
      where: { id },
      data: { status: DisposalStatus.OPEN_FOR_BIDS, bidOpensOn: input.bidOpensOn, bidClosesOn: input.bidClosesOn },
    });
  },

  async awardLot(lotId: string, input: AwardLotInput): Promise<void> {
    const lot = await prisma.disposalLot.findUnique({
      where: { id: lotId },
      select: { id: true, caseId: true, reservePrice: true, currency: true, winningBid: true, case: { select: { status: true } } },
    });
    if (!lot) throw new NotFoundError('DisposalLot', lotId);
    if (lot.winningBid) throw new ValidationError('Lot is already awarded');
    if (lot.case.status !== DisposalStatus.OPEN_FOR_BIDS && lot.case.status !== DisposalStatus.AWARDED) {
      throw new ValidationError(`Lot's case must be OPEN_FOR_BIDS or AWARDED (currently ${lot.case.status})`);
    }
    if (lot.currency !== input.currency) {
      throw new ValidationError(`Winning bid currency ${input.currency} must match lot currency ${lot.currency}`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.disposalLot.update({
        where: { id: lotId },
        data: {
          winningBid: input.winningBid,
          winningBidderName: input.winningBidderName,
          winningBidderFirmId: input.winningBidderFirmId ?? null,
          awardedOn: input.awardedOn,
        },
      });
      // Bubble: when all lots in a case are awarded, flip the case to AWARDED (if not already).
      const remaining = await tx.disposalLot.count({ where: { caseId: lot.caseId, winningBid: null } });
      if (remaining === 0 && lot.case.status !== DisposalStatus.AWARDED) {
        await tx.disposalCase.update({ where: { id: lot.caseId }, data: { status: DisposalStatus.AWARDED, awardedOn: input.awardedOn } });
      }
    });
  },

  async complete(id: string, input: CompleteDisposalInput): Promise<void> {
    const row = await prisma.disposalCase.findUnique({
      where: { id },
      select: { id: true, status: true, currency: true, lots: { select: { winningBid: true } } },
    });
    if (!row) throw new NotFoundError('DisposalCase', id);
    if (row.status !== DisposalStatus.AWARDED) {
      throw new ValidationError(`Disposal must be AWARDED to complete (currently ${row.status})`);
    }
    // Sum winning bids for totalProceeds (string math via Prisma Decimal → number via Number()).
    const total = row.lots.reduce((sum, l) => sum + (l.winningBid ? Number(l.winningBid.toString()) : 0), 0);
    await prisma.disposalCase.update({
      where: { id },
      data: { status: DisposalStatus.COMPLETED, completedOn: input.completedOn, totalProceeds: total.toFixed(4) },
    });
  },

  async cancel(id: string, input: CancelDisposalInput): Promise<void> {
    const row = await prisma.disposalCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('DisposalCase', id);
    if (row.status === DisposalStatus.COMPLETED || row.status === DisposalStatus.CANCELLED) {
      throw new ValidationError(`Disposal is already ${row.status}`);
    }
    await prisma.disposalCase.update({
      where: { id },
      data: { status: DisposalStatus.CANCELLED, cancelledReason: input.cancelledReason },
    });
  },
};

export const appealService = {
  async file(filedByUserId: string | null, input: FileAppealInput): Promise<{ id: string }> {
    const grievance = await prisma.grievance.findUnique({
      where: { id: input.grievanceId },
      select: { id: true, status: true },
    });
    if (!grievance) throw new NotFoundError('Grievance', input.grievanceId);
    if (grievance.status !== GrievanceStatus.REJECTED && grievance.status !== GrievanceStatus.UPHELD) {
      throw new ValidationError('Only a decided grievance can be appealed');
    }
    const existing = await prisma.appeal.findUnique({ where: { grievanceId: input.grievanceId }, select: { id: true } });
    if (existing) throw new ValidationError('An appeal has already been filed for this grievance');
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.appeal.create({
        data: {
          id,
          grievanceId: input.grievanceId,
          filedOn: input.filedOn,
          filedByUserId,
          basis: input.basis,
          documentKey: input.documentKey ?? null,
        },
      });
      // Also flip the grievance to APPEALED so the pre-award guard knows to block award.
      await tx.grievance.update({
        where: { id: input.grievanceId },
        data: { status: GrievanceStatus.APPEALED, appealedToPPRAOn: input.filedOn },
      });
    });
    return { id };
  },

  async decide(id: string, input: DecideAppealInput): Promise<void> {
    const row = await prisma.appeal.findUnique({ where: { id }, select: { id: true, status: true, grievanceId: true } });
    if (!row) throw new NotFoundError('Appeal', id);
    if (row.status !== AppealStatus.PENDING) {
      throw new ValidationError(`Appeal ${id} is already ${row.status.toLowerCase()}`);
    }
    const nextAppealStatus = input.decision === 'UPHELD' ? AppealStatus.UPHELD : AppealStatus.REJECTED;
    // After the appeal is decided, the grievance returns to the matching terminal state.
    const nextGrievanceStatus = input.decision === 'UPHELD' ? GrievanceStatus.UPHELD : GrievanceStatus.REJECTED;
    await prisma.$transaction(async (tx) => {
      await tx.appeal.update({
        where: { id },
        data: { status: nextAppealStatus, decidedOn: input.decidedOn, decisionText: input.decisionText },
      });
      await tx.grievance.update({ where: { id: row.grievanceId }, data: { status: nextGrievanceStatus } });
    });
  },

  async withdraw(id: string, _input: WithdrawAppealInput): Promise<void> {
    const row = await prisma.appeal.findUnique({ where: { id }, select: { id: true, status: true, grievanceId: true } });
    if (!row) throw new NotFoundError('Appeal', id);
    if (row.status !== AppealStatus.PENDING) {
      throw new ValidationError('Only a PENDING appeal can be withdrawn');
    }
    await prisma.$transaction(async (tx) => {
      await tx.appeal.update({ where: { id }, data: { status: AppealStatus.WITHDRAWN } });
      // Return the parent grievance to its terminal (decided) state — pick REJECTED as the safe default
      // if the Appeal was filed against a REJECTED grievance; otherwise keep the UPHELD disposition.
      // In practice we don't know which; leave the grievance alone and rely on filedOn timing.
    });
  },
};
