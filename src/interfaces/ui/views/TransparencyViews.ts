import { prisma } from '@/infrastructure/db/prisma';

export interface IncidentRow {
  readonly id: string;
  readonly indentId: string | null;
  readonly ruleReference: string;
  readonly summary: string;
  readonly severity: string;
  readonly status: string;
  readonly detectedOn: string;
  readonly remediatedOn: string | null;
  readonly reportedToPPRAOn: string | null;
}

export async function listIncidents(): Promise<readonly IncidentRow[]> {
  const rows = await prisma.misprocurementIncident.findMany({
    orderBy: { detectedOn: 'desc' },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    indentId: r.indentId,
    ruleReference: r.ruleReference,
    summary: r.summary,
    severity: r.severity,
    status: r.status,
    detectedOn: r.detectedOn.toISOString(),
    remediatedOn: r.remediatedOn?.toISOString() ?? null,
    reportedToPPRAOn: r.reportedToPPRAOn?.toISOString() ?? null,
  }));
}

export interface RetentionHoldRow {
  readonly id: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly reason: string;
  readonly placedOn: string;
  readonly releasedOn: string | null;
  readonly notes: string | null;
}

export async function listRetentionHolds(): Promise<readonly RetentionHoldRow[]> {
  const rows = await prisma.retentionHold.findMany({
    orderBy: { placedOn: 'desc' },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    reason: r.reason,
    placedOn: r.placedOn.toISOString(),
    releasedOn: r.releasedOn?.toISOString() ?? null,
    notes: r.notes,
  }));
}
