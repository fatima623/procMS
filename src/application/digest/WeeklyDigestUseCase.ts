import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import type { Mailer } from '../ports/Mailer';
import { digestRecipientService } from '@/application/admin/AdminDigestRecipientService';

export interface DigestRecipient { readonly email: string; readonly name?: string; }
export interface DigestInput { readonly recipients: readonly DigestRecipient[]; readonly asOf?: Date; }
export interface DigestResult {
  readonly sent: boolean;
  readonly recipients: number;
  readonly subject: string;
  readonly stats: Record<string, number | string>;
}

/**
 * Weekly executive digest. Pulls a bounded set of KPIs for the week leading
 * up to `asOf` (defaults to now) and emails them in a single HTML message.
 *
 * Idempotency: callers either dedupe themselves (cron that fires once a
 * week) or accept a near-identical digest if invoked twice.
 */
export class WeeklyDigestUseCase {
  constructor(private readonly mailer: Mailer) {}

  public async execute(input: DigestInput): Promise<DigestResult> {
    const asOf = input.asOf ?? new Date();
    const weekAgo = new Date(asOf.getTime() - 7 * 86_400_000);

    const [newIndents, closedThisWeek, pendingApprovals, prsIssued, awardedActive] = await Promise.all([
      prisma.indent.count({ where: { createdAt: { gte: weekAgo, lte: asOf } } }),
      prisma.indent.count({ where: { status: 'CLOSED', closedAt: { gte: weekAgo, lte: asOf } } }),
      prisma.approvalStep.count({ where: { status: 'PENDING', chain: { status: 'PENDING' } } }),
      prisma.purchaseRequisition.findMany({
        where: { createdAt: { gte: weekAgo, lte: asOf } },
        select: { prNumber: true, amount: true, firm: { select: { name: true } } },
      }),
      prisma.indent.findMany({
        where: { status: { notIn: ['CLOSED', 'CANCELLED', 'INDENT_REJECTED', 'BUDGET_REJECTED'] as unknown as any[] } },
        select: { estimatedValue: true },
      }),
    ]);

    const awardedTotal = prsIssued.reduce((acc, p) => acc + decimalToMinor(p.amount as unknown as string), 0n);
    const pipelineTotal = awardedActive.reduce((acc, i) => acc + decimalToMinor(i.estimatedValue as unknown as string), 0n);

    const stats = {
      asOf: asOf.toISOString().slice(0, 10),
      newIndents, closedThisWeek, pendingApprovals,
      prsIssued: prsIssued.length,
      awardedThisWeekPKR: formatPKR(awardedTotal),
      pipelinePKR: formatPKR(pipelineTotal),
    };

    const subject = `[DP-N] Weekly digest — ${stats.asOf}`;
    const text = plain(stats, prsIssued);
    const html = htmlTemplate(stats, prsIssued);

    // Merge caller-provided recipients with the DB-driven list so the admin
    // page is the source of truth going forward (env var still works).
    const dbEmails = await digestRecipientService.listActiveEmails();
    const seen = new Set<string>();
    const allRecipients = [
      ...input.recipients,
      ...dbEmails.map((email) => ({ email })),
    ].filter((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (allRecipients.length === 0) {
      return { sent: false, recipients: 0, subject, stats };
    }
    await this.mailer.send({ to: allRecipients.map((r) => r.email), subject, html, text });
    return { sent: true, recipients: allRecipients.length, subject, stats };
  }
}

function formatPKR(minor: bigint): string {
  const asMainUnit = Number(minor) / 10_000;
  if (asMainUnit >= 1_000_000_000) return `${(asMainUnit / 1_000_000_000).toFixed(2)} Bn PKR`;
  if (asMainUnit >= 1_000_000) return `${(asMainUnit / 1_000_000).toFixed(2)} Mn PKR`;
  if (asMainUnit >= 1_000) return `${(asMainUnit / 1_000).toFixed(0)} K PKR`;
  return `${asMainUnit.toFixed(0)} PKR`;
}

function plain(stats: Record<string, number | string>, prs: Array<{ prNumber: string; amount: unknown; firm: { name: string } }>): string {
  return [
    `DP-N Weekly digest — ${stats.asOf}`,
    '',
    `New indents this week: ${stats.newIndents}`,
    `Closed this week:      ${stats.closedThisWeek}`,
    `Pending approvals:     ${stats.pendingApprovals}`,
    `PRs issued this week:  ${stats.prsIssued} (${stats.awardedThisWeekPKR})`,
    `Live pipeline:         ${stats.pipelinePKR}`,
    '',
    'PRs issued this week:',
    ...prs.map((p) => `  ${p.prNumber} · ${p.firm.name} · ${formatPKR(decimalToMinor(p.amount as unknown as string))}`),
  ].join('\n');
}

function htmlTemplate(stats: Record<string, number | string>, prs: Array<{ prNumber: string; amount: unknown; firm: { name: string } }>): string {
  const rows = Object.entries(stats).map(([k, v]) => `<tr><td style="color:#555;padding:4px 10px 4px 0;">${k}</td><td style="font-weight:600;padding:4px 0;">${v}</td></tr>`).join('');
  const prList = prs.length === 0
    ? `<p style="color:#777;">No PRs issued this week.</p>`
    : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
         <thead><tr style="background:#f3f3f3;"><th style="text-align:left;padding:6px;">PR number</th><th style="text-align:left;padding:6px;">Firm</th><th style="text-align:right;padding:6px;">Amount</th></tr></thead>
         <tbody>${prs.map((p) => `<tr><td style="padding:6px;border-bottom:1px solid #eee;font-family:monospace;">${p.prNumber}</td><td style="padding:6px;border-bottom:1px solid #eee;">${p.firm.name}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${formatPKR(decimalToMinor(p.amount as unknown as string))}</td></tr>`).join('')}</tbody>
       </table>`;
  return `
<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#111;padding:24px;">
  <h2 style="margin:0 0 4px;">DP-N weekly digest</h2>
  <p style="color:#555;margin:0 0 16px;">Week ending ${stats.asOf}</p>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">${rows}</table>
  <h3 style="margin:0 0 6px;">PRs issued</h3>
  ${prList}
  <p style="color:#999;font-size:11px;margin-top:24px;">Generated automatically. Reply to this email with "unsubscribe" to be removed from the digest list.</p>
</body></html>`;
}
