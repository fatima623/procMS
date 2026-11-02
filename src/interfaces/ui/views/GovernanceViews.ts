import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

// --- Committees ---------------------------------------------------------------

export interface CommitteeRow {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly termStart: string;
  readonly termEnd: string | null;
  readonly isActive: boolean;
  readonly members: readonly {
    readonly id: string;
    readonly userId: string;
    readonly userName: string | null;
    readonly memberRole: string;
    readonly joinedOn: string;
    readonly leftOn: string | null;
  }[];
  readonly activeMemberCount: number;
}

export async function listCommittees(): Promise<readonly CommitteeRow[]> {
  const rows = await prisma.committee.findMany({
    orderBy: { createdAt: 'desc' },
    include: { members: { orderBy: { joinedOn: 'asc' } } },
    take: 100,
  });
  const userIds = Array.from(new Set(rows.flatMap((r) => r.members.map((m) => m.userId))));
  const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } }) : [];
  const userName = new Map(users.map((u) => [u.id, u.displayName]));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    termStart: r.termStart.toISOString(),
    termEnd: r.termEnd?.toISOString() ?? null,
    isActive: r.isActive,
    members: r.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: userName.get(m.userId) ?? null,
      memberRole: m.memberRole,
      joinedOn: m.joinedOn.toISOString(),
      leftOn: m.leftOn?.toISOString() ?? null,
    })),
    activeMemberCount: r.members.filter((m) => !m.leftOn).length,
  }));
}

export interface UserPick {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export async function listUsersForPicker(): Promise<readonly UserPick[]> {
  const rows = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, email: true },
    take: 500,
  });
  return rows;
}

// --- Contract amendments ------------------------------------------------------

export interface ContractAmendmentRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly scope: string;
  readonly summary: string;
  readonly status: string;
  readonly deltaValueMinor: string | null;
  readonly deltaCurrency: string | null;
  readonly requestedOn: string;
  readonly approvedOn: string | null;
  readonly rejectionReason: string | null;
}

export async function listContractAmendments(): Promise<readonly ContractAmendmentRow[]> {
  const rows = await prisma.contractAmendment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    scope: r.scope,
    summary: r.summary,
    status: r.status,
    deltaValueMinor: r.deltaValue ? decimalToMinor(r.deltaValue).toString() : null,
    deltaCurrency: r.deltaCurrency,
    requestedOn: r.requestedOn.toISOString(),
    approvedOn: r.approvedOn?.toISOString() ?? null,
    rejectionReason: r.rejectionReason,
  }));
}
