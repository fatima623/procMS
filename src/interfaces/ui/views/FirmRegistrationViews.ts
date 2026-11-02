import { FirmRegistrationStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

export interface FirmRegistrationRow {
  readonly id: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly category: string;
  readonly status: string;
  readonly submittedOn: string;
  readonly issuedOn: string | null;
  readonly validUntil: string | null;
  readonly reviewNotes: string | null;
  readonly derivedExpired: boolean;
}

export async function listFirmRegistrations(): Promise<readonly FirmRegistrationRow[]> {
  const rows = await prisma.firmRegistration.findMany({
    orderBy: { createdAt: 'desc' },
    include: { firm: { select: { id: true, name: true } } },
    take: 300,
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    firmId: r.firm.id,
    firmName: r.firm.name,
    category: r.category,
    status: r.status,
    submittedOn: r.submittedOn.toISOString(),
    issuedOn: r.issuedOn?.toISOString() ?? null,
    validUntil: r.validUntil?.toISOString() ?? null,
    reviewNotes: r.reviewNotes,
    derivedExpired:
      r.status === FirmRegistrationStatus.APPROVED && r.validUntil !== null && r.validUntil.getTime() < now.getTime(),
  }));
}

export async function countApprovedFirmRegistrations(): Promise<number> {
  return prisma.firmRegistration.count({ where: { status: FirmRegistrationStatus.APPROVED } });
}

export async function countPendingFirmRegistrations(): Promise<number> {
  return prisma.firmRegistration.count({ where: { status: FirmRegistrationStatus.PENDING } });
}
