import type { Prisma, PrismaClient, ApprovalChain as DbChain, ApprovalStep as DbStep } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { ApprovalChain } from '@/domain/approval/ApprovalChain';
import { ApprovalStep } from '@/domain/approval/ApprovalStep';
import {
  ApprovalChainStatus,
  ApprovalRole,
  ApprovalStepStatus,
  ApprovalSubject,
} from '@/domain/approval/ApprovalTypes';
import type { ApprovalChainRepository } from '@/application/ports/ApprovalChainRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaApprovalChainRepository implements ApprovalChainRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<ApprovalChain | null> {
    const row = await this.tx.approvalChain.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
    if (!row) return null;
    return this.toAggregate(row, row.steps);
  }

  public async findBySubject(subject: ApprovalSubject, subjectId: string): Promise<ApprovalChain | null> {
    const row = await this.tx.approvalChain.findUnique({
      where: { subject_subjectId: { subject, subjectId } },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
    if (!row) return null;
    return this.toAggregate(row, row.steps);
  }

  public async insert(chain: ApprovalChain): Promise<void> {
    await this.tx.approvalChain.create({
      data: {
        id: chain.id,
        subject: chain.subject,
        subjectId: chain.subjectId,
        status: chain.status,
        currentIndex: chain.currentIndex,
        completedAt: chain.completedAt,
        version: 0,
        steps: {
          create: chain.steps.map((s) => ({
            id: s.id,
            stepIndex: s.stepIndex,
            role: s.role,
            assignedUserId: s.assignedUserId,
            status: s.status,
            decidedByUserId: s.decidedByUserId,
            decidedAt: s.decidedAt,
            comments: s.comments,
          })),
        },
      },
    });
    chain.markPersisted(0);
  }

  public async save(chain: ApprovalChain): Promise<void> {
    const expectedVersion = chain.version;
    const result = await this.tx.approvalChain.updateMany({
      where: { id: chain.id, version: expectedVersion },
      data: {
        status: chain.status,
        currentIndex: chain.currentIndex,
        completedAt: chain.completedAt,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('ApprovalChain', chain.id);
    }
    // Persist step mutations. We write only the current + previously-decided
    // steps because `decide()` only ever touches those two.
    for (const step of chain.steps) {
      await this.tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: step.status,
          assignedUserId: step.assignedUserId,
          decidedByUserId: step.decidedByUserId,
          decidedAt: step.decidedAt,
          comments: step.comments,
        },
      });
    }
    chain.markPersisted(expectedVersion + 1);
  }

  private toAggregate(row: DbChain, stepRows: DbStep[]): ApprovalChain {
    const steps = stepRows.map((s) =>
      ApprovalStep.create(s.id, {
        chainId: s.chainId,
        stepIndex: s.stepIndex,
        role: s.role as ApprovalRole,
        assignedUserId: s.assignedUserId,
        status: s.status as ApprovalStepStatus,
        decidedByUserId: s.decidedByUserId,
        decidedAt: s.decidedAt,
        comments: s.comments,
      }),
    );
    return ApprovalChain.rehydrate(row.id, row.version, {
      subject: row.subject as ApprovalSubject,
      subjectId: row.subjectId,
      status: row.status as ApprovalChainStatus,
      currentIndex: row.currentIndex,
      steps,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    });
  }
}
