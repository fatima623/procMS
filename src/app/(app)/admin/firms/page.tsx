import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFirmService } from '@/application/admin/AdminFirmService';
import { prisma } from '@/infrastructure/db/prisma';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { Pager } from '@/interfaces/ui/components/Pager';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Firms • Admin' };

const service = new AdminFirmService();

const ICON = {
  firm:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21V12h6v9"/></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  warn:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L2 20h20z"/><path d="M12 10v5M12 18h.01"/></svg>,
  ban:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>,
};

export default async function FirmsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const [result, total, active, blacklisted, inactive, noNtn] = await Promise.all([
    service.list(ctx, { search: searchParams.q, page }),
    prisma.firm.count(),
    prisma.firm.count({ where: { isActive: true, isBlacklisted: false } }),
    prisma.firm.count({ where: { isBlacklisted: true } }),
    prisma.firm.count({ where: { isActive: false, isBlacklisted: false } }),
    prisma.firm.count({ where: { ntn: null, isBlacklisted: false } }),
  ]);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Firms</h1>
        <div className="grow" />
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input className="input" name="q" placeholder="Search code / name / NTN" defaultValue={searchParams.q ?? ''} style={{ width: 280 }} />
          <button className="btn">Search</button>
        </form>
        <Link href="/admin/firms/new" className="btn btn-primary">+ New firm</Link>
      </div>

      {/* Portfolio summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.firm}  label="All firms"           value={total}       sub="On the roster" />
        <KpiCard accent="emerald" icon={ICON.check} label="Active"              value={active}      sub="Ready for tender" />
        <KpiCard accent="amber"   icon={ICON.warn}  label="Needs verification"  value={noNtn}       sub="Missing NTN" />
        <KpiCard accent="violet"  icon={ICON.firm}  label="Inactive"            value={inactive}    sub="Deactivated by admin" />
        <KpiCard accent="coral"   icon={ICON.ban}   label="Blacklisted"         value={blacklisted} sub="Excluded from tenders" />
      </section>

      {result.items.length === 0 ? (
        <Empty>No firms match.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>NTN</th><th>City</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {result.items.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.code}</td>
                  <td>{f.name}</td>
                  <td className="mono muted">{f.ntn ?? '—'}</td>
                  <td>{f.city ?? <span className="muted">—</span>}</td>
                  <td>
                    {f.isBlacklisted
                      ? <StatusPill tone="danger">Blacklisted</StatusPill>
                      : f.isActive
                        ? <StatusPill tone="ok">Active</StatusPill>
                        : <StatusPill tone="warn">Inactive</StatusPill>}
                  </td>
                  <td className="right"><Link className="btn" href={`/admin/firms/${f.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pathname="/admin/firms" page={result.page} pageSize={result.pageSize} total={result.total} searchParams={searchParams as Record<string, string | undefined>} />
    </>
  );
}
