import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFirmService } from '@/application/admin/AdminFirmService';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { MoneyCompact } from '@/interfaces/ui/components/Money';
import { FirmForm } from '../FirmForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit firm • Admin' };

const service = new AdminFirmService();

const H_ICON = {
  firm:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
  shield: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>,
  doc:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
};

export default async function EditFirmPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const firm = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!firm) notFound();

  const [invites, prs, prValueAgg] = await Promise.all([
    prisma.iTFirmInvite.count({ where: { firmId: firm.id } }),
    prisma.purchaseRequisition.count({ where: { firmId: firm.id } }),
    prisma.purchaseRequisition.aggregate({ where: { firmId: firm.id }, _sum: { amount: true } }),
  ]);
  const awarded = prValueAgg._sum.amount ? decimalToMinor(prValueAgg._sum.amount as unknown as string).toString() : '0';
  const statusAccent: Accent = firm.isBlacklisted ? 'coral' : firm.isActive ? 'emerald' : 'amber';
  const statusLabel = firm.isBlacklisted ? 'Blacklisted' : firm.isActive ? 'Active' : 'Inactive';

  return (
    <>
      <h1>{firm.name}</h1>
      <p className="muted mono">{firm.code}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent={statusAccent} icon={H_ICON.shield} label="Status"        value={statusLabel}       sub={firm.ntn ? `NTN ${firm.ntn}` : 'No NTN on file'} />
        <KpiCard accent="indigo"       icon={H_ICON.firm}   label="Location"      value={firm.city ?? '—'}  sub={firm.country ?? 'No country set'} />
        <KpiCard accent="sky"          icon={H_ICON.doc}    label="Invites / PRs" value={`${invites} / ${prs}`} sub={`${invites} tender invite${invites === 1 ? '' : 's'}, ${prs} PR${prs === 1 ? '' : 's'}`} />
        <KpiCard accent="violet"       icon={H_ICON.wallet} label="Awarded value" value={<MoneyCompact amountMinor={awarded} currency="PKR" precision={2} />} sub="Lifetime, across all PRs" />
      </section>

      <FirmForm
        mode="edit"
        firmId={firm.id}
        initial={{
          code: firm.code,
          name: firm.name,
          ntn: firm.ntn ?? '',
          address: firm.address ?? '',
          city: firm.city ?? '',
          country: firm.country ?? '',
          email: firm.email ?? '',
          phone: firm.phone ?? '',
          isActive: firm.isActive,
          isBlacklisted: firm.isBlacklisted,
        }}
      />
    </>
  );
}
