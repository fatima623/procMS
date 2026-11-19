import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { BudgetCardActions } from './BudgetCardActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget Card' };

export default async function BudgetCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSessionCtx();

  const indent = await prisma.indent.findUnique({
    where: { id },
    select: { id: true, indentNumber: true, subject: true, status: true, estimatedValue: true, currency: true },
  });
  if (!indent) notFound();

  const card = await prisma.budgetCard.findUnique({ where: { indentId: id } });
  const [fy, head] = card
    ? await Promise.all([
        prisma.fiscalYear.findUnique({ where: { id: card.fiscalYearId }, select: { label: true } }),
        prisma.budgetHead.findUnique({ where: { id: card.budgetHeadId }, select: { code: true, description: true } }),
      ])
    : [null, null];

  const canAct = ctx.roles.includes(Role.BUDGET_STAFF) || ctx.roles.includes(Role.ADMIN);
  const status = String(indent.status);

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="row no-print" style={{ marginBottom: 16, gap: 8 }}>
        <Link className="btn" href={`/indents/${id}`}>← Back to indent</Link>
      </div>

      <h1 style={{ marginBottom: 4 }}>Budget Card</h1>
      <p className="muted mono" style={{ marginTop: 0 }}>{indent.indentNumber} — {indent.subject}</p>

      {!card ? (
        <div className="card" style={{ padding: 16 }}>
          <p>No Budget Card has been prepared for this indent yet.</p>
        </div>
      ) : (
        <section className="card" style={{ padding: 16 }}>
          <dl style={{ display: 'grid', gridTemplateColumns: '200px 1fr', rowGap: 8, columnGap: 10, margin: 0 }}>
            <dt className="dim">Control number</dt><dd className="mono">{card.controlNumber}</dd>
            <dt className="dim">Fiscal year</dt><dd>{fy?.label ?? '—'}</dd>
            <dt className="dim">Budget head</dt><dd><span className="mono">{head?.code ?? '—'}</span> {head?.description ?? ''}</dd>
            <dt className="dim">Reserved amount</dt>
            <dd><MoneyLabel amountMinor={decimalToMinor(card.reservedAmount.toString()).toString()} currency={card.currency} /></dd>
            <dt className="dim">Prepared</dt><dd><DateLabel iso={card.preparedAt.toISOString()} /></dd>
            <dt className="dim">Cleared</dt><dd>{card.clearedAt ? <DateLabel iso={card.clearedAt.toISOString()} /> : <span className="muted">Not yet</span>}</dd>
            <dt className="dim">Committed</dt><dd>{card.committedAt ? <DateLabel iso={card.committedAt.toISOString()} /> : <span className="muted">Not yet</span>}</dd>
            {card.notes && (<><dt className="dim">Notes</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{card.notes}</dd></>)}
          </dl>
        </section>
      )}

      <div className="no-print" style={{ marginTop: 16 }}>
        <BudgetCardActions
          indentId={id}
          hasCard={!!card}
          isCleared={!!card?.clearedAt}
          isCommitted={!!card?.committedAt}
          status={status}
          canAct={canAct}
        />
      </div>
    </>
  );
}