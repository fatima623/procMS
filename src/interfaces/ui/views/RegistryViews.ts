import { CorrespondenceDirection, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

export interface CorrespondenceRow {
  readonly id: string;
  readonly direction: string;
  readonly controlNumber: string;
  readonly subject: string;
  readonly fromParty: string;
  readonly toParty: string;
  readonly receivedOrSentOn: string;
  readonly assignedToName: string | null;
  readonly minuteCount: number;
}

export interface CorrespondenceFilter {
  readonly direction?: string;
  readonly q?: string;
}

export async function listCorrespondence(filter: CorrespondenceFilter = {}): Promise<readonly CorrespondenceRow[]> {
  const where: Prisma.OfficialCorrespondenceWhereInput = {};
  if (filter.direction === CorrespondenceDirection.INWARD || filter.direction === CorrespondenceDirection.OUTWARD) {
    where.direction = filter.direction;
  }
  const q = filter.q?.trim();
  if (q) {
    where.OR = [
      { controlNumber: { contains: q } },
      { subject: { contains: q } },
      { fromParty: { contains: q } },
      { toParty: { contains: q } },
    ];
  }
  const rows = await prisma.officialCorrespondence.findMany({
    where,
    orderBy: [{ receivedOrSentOn: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: { _count: { select: { minutes: true } } },
  });
  const names = await userNames(rows.map((r) => r.assignedToUserId));
  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    controlNumber: r.controlNumber,
    subject: r.subject,
    fromParty: r.fromParty,
    toParty: r.toParty,
    receivedOrSentOn: r.receivedOrSentOn.toISOString(),
    assignedToName: r.assignedToUserId ? (names.get(r.assignedToUserId) ?? null) : null,
    minuteCount: r._count.minutes,
  }));
}

export interface CorrespondenceDetail {
  readonly id: string;
  readonly direction: string;
  readonly controlNumber: string;
  readonly subject: string;
  readonly fromParty: string;
  readonly toParty: string;
  readonly receivedOrSentOn: string;
  readonly assignedToUserId: string | null;
  readonly assignedToName: string | null;
  readonly remarks: string | null;
  readonly documentKey: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly minutes: readonly {
    readonly id: string;
    readonly kind: string;
    readonly text: string;
    readonly authorName: string | null;
    readonly createdAt: string;
  }[];
  readonly postalStamps: readonly PostalStampRow[];
}

export async function loadCorrespondence(id: string): Promise<CorrespondenceDetail | null> {
  const r = await prisma.officialCorrespondence.findUnique({
    where: { id },
    include: {
      minutes: { orderBy: { createdAt: 'asc' } },
      postalStamps: { orderBy: { usedOn: 'desc' } },
    },
  });
  if (!r) return null;
  const names = await userNames([
    r.assignedToUserId,
    r.createdByUserId,
    ...r.minutes.map((m) => m.authorUserId),
    ...r.postalStamps.map((s) => s.enteredByUserId),
  ]);
  return {
    id: r.id,
    direction: r.direction,
    controlNumber: r.controlNumber,
    subject: r.subject,
    fromParty: r.fromParty,
    toParty: r.toParty,
    receivedOrSentOn: r.receivedOrSentOn.toISOString(),
    assignedToUserId: r.assignedToUserId,
    assignedToName: r.assignedToUserId ? (names.get(r.assignedToUserId) ?? null) : null,
    remarks: r.remarks,
    documentKey: r.documentKey,
    createdByName: names.get(r.createdByUserId) ?? null,
    createdAt: r.createdAt.toISOString(),
    minutes: r.minutes.map((m) => ({
      id: m.id,
      kind: m.kind,
      text: m.text,
      authorName: names.get(m.authorUserId) ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    postalStamps: r.postalStamps.map((s) => toStampRow(s, names, r.controlNumber)),
  };
}

export interface PostalStampRow {
  readonly id: string;
  readonly correspondenceId: string | null;
  readonly controlNumber: string | null;
  readonly denomination: string;
  readonly quantity: number;
  readonly total: string;
  readonly usedOn: string;
  readonly enteredByName: string | null;
}

export async function listPostalStamps(): Promise<{ rows: readonly PostalStampRow[]; grandTotal: string }> {
  const rows = await prisma.postalStamp.findMany({
    orderBy: [{ usedOn: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    include: { correspondence: { select: { controlNumber: true } } },
  });
  const names = await userNames(rows.map((r) => r.enteredByUserId));
  const mapped = rows.map((r) => toStampRow(r, names, r.correspondence?.controlNumber ?? null));
  const grandTotalPaisa = rows.reduce((sum, r) => sum + paisa(r.denomination) * r.quantity, 0);
  return { rows: mapped, grandTotal: formatPaisa(grandTotalPaisa) };
}

/** Outward letters, newest first — for the "link to letter" dropdown on the stamp form. */
export async function listOutwardOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.officialCorrespondence.findMany({
    where: { direction: CorrespondenceDirection.OUTWARD },
    orderBy: { receivedOrSentOn: 'desc' },
    take: 100,
    select: { id: true, controlNumber: true, subject: true },
  });
  return rows.map((r) => ({ id: r.id, label: `${r.controlNumber} — ${r.subject.slice(0, 60)}` }));
}

/** Active internal (non-firm) users, for the "assign to" dropdown. */
export async function listAssignableUsers(): Promise<readonly { id: string; label: string }[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, firmId: null },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, rank: true, email: true },
  });
  return users.map((u) => {
    // Skip the rank prefix when displayName already starts with it ("Cdr M. Riaz").
    const hasRank = !!u.rank && u.displayName.toLowerCase().startsWith(`${u.rank.toLowerCase()} `);
    return { id: u.id, label: `${u.rank && !hasRank ? `${u.rank} ` : ''}${u.displayName} (${u.email})` };
  });
}

// --- helpers ----------------------------------------------------------------

function toStampRow(
  s: { id: string; correspondenceId: string | null; denomination: Prisma.Decimal; quantity: number; usedOn: Date; enteredByUserId: string },
  names: Map<string, string>,
  controlNumber: string | null,
): PostalStampRow {
  return {
    id: s.id,
    correspondenceId: s.correspondenceId,
    controlNumber,
    denomination: formatPaisa(paisa(s.denomination)),
    quantity: s.quantity,
    total: formatPaisa(paisa(s.denomination) * s.quantity),
    usedOn: s.usedOn.toISOString(),
    enteredByName: names.get(s.enteredByUserId) ?? null,
  };
}

/** Decimal(10,2) → integer paisa, so totals have no floating-point drift. */
function paisa(d: Prisma.Decimal): number {
  return Math.round(Number(d.toString()) * 100);
}

function formatPaisa(p: number): string {
  const whole = Math.trunc(p / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${String(Math.abs(p % 100)).padStart(2, '0')}`;
}

async function userNames(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true } });
  return new Map(users.map((u) => [u.id, u.displayName]));
}
