import type { Prisma, PrismaClient } from '@prisma/client';
import type { PrePPRecord, PrePPRepository } from '@/application/ports/PrePPRepository';

type Db = PrismaClient | Prisma.TransactionClient;

const SELECT = { id: true, indentId: true, status: true, approvalChainId: true } as const;

export class PrismaPrePPRepository implements PrePPRepository {
  constructor(private readonly db: Db) {}

  public async findById(id: string): Promise<PrePPRecord | null> {
    return this.db.prePurchaseProposal.findUnique({ where: { id }, select: SELECT });
  }

  public async findByIndentId(indentId: string): Promise<PrePPRecord | null> {
    return this.db.prePurchaseProposal.findUnique({ where: { indentId }, select: SELECT });
  }

  public async setPending(id: string, approvalChainId: string): Promise<void> {
    await this.db.prePurchaseProposal.update({
      where: { id },
      data: { status: 'PENDING', approvalChainId, version: { increment: 1 } },
    });
  }

  public async setDecision(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<void> {
    await this.db.prePurchaseProposal.update({
      where: { id },
      data: { status, rejectionReason: rejectionReason ?? null, version: { increment: 1 } },
    });
  }
}