import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { ulid } from 'ulid';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { terminateContractSchema } from '@/interfaces/http/schemas/contractTermination';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DPP&I-35 Ch XXII — terminate a contract on supplier default and
 * (by default) open a risk-purchase case to track the re-tender. The two
 * writes happen in the same transaction. Pass `openRiskPurchaseCase: false`
 * to terminate without a risk-purchase case (unusual).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN, Role.DP_N, Role.DGDP, Role.SECY_DP]);
    const body = terminateContractSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
      if (!contract) throw new NotFoundError('Contract', params.id);
      if (contract.status === 'TERMINATED') {
        throw new ValidationError('Contract is already TERMINATED');
      }
      if (contract.status === 'CLOSED') {
        throw new ValidationError('A CLOSED contract cannot be terminated');
      }
      await tx.contract.update({ where: { id: params.id }, data: { status: 'TERMINATED' } });

      let riskPurchaseId: string | null = null;
      if (body.openRiskPurchaseCase) {
        const existing = await tx.riskPurchaseCase.findUnique({ where: { originalContractId: params.id }, select: { id: true } });
        if (!existing) {
          const id = ulid();
          await tx.riskPurchaseCase.create({
            data: {
              id,
              originalContractId: params.id,
              triggerReason: body.terminationReason,
              initiatedOn: body.initiatedOn,
              initiatedByUserId: ctx.userId,
            },
          });
          riskPurchaseId = id;
        } else {
          riskPurchaseId = existing.id;
        }
      }
      return { contractId: params.id, riskPurchaseId };
    });

    return NextResponse.json({ data: result }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
