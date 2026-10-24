import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFiscalYearService } from '@/application/admin/AdminFiscalYearService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fiscal years • Admin' };

const service = new AdminFiscalYearService();

const ICON = {
  cal:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
  pin:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 10v9l4 3 4-3v-9z"/></svg>,
  stack: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
};

export default async function FiscalYearsPage() {
  const ctx = await requireRoles([Role.ADMIN]);
  const rows = await service.list(ctx);
  const active = rows.find((f) => f.isActive);
  const totalIndents = rows.reduce((n, f) => n + f.indentCount, 0);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Fiscal years</h1>
        <div className="grow" />
        <Link href="/admin/fiscal-years/new" className="btn btn-primary">+ New fiscal year</Link>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="violet"  icon={ICON.cal}   label="Fiscal years" value={rows.length}                  sub="On the books" />
        <KpiCard accent="emerald" icon={ICON.pin}   label="Active"       value={active?.label ?? '—'}         sub={active ? `${active.startsOn} → ${active.endsOn}` : 'None marked active'} />
        <KpiCard accent="indigo"  icon={ICON.stack} label="Indents (all)" value={totalIndents}                sub="Lifetime count across years" />
      </section>
      {rows.length === 0 ? (
        <Empty>No fiscal years defined.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Label</th><th>Starts</th><th>Ends</th><th className="right">Indents</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.label}</td>
                  <td className="mono">{f.startsOn}</td>
                  <td className="mono">{f.endsOn}</td>
                  <td className="right mono">{f.indentCount}</td>
                  <td>{f.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="default">—</StatusPill>}</td>
                  <td className="right"><Link className="btn" href={`/admin/fiscal-years/${f.id}`}>Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Setting a year as <code>Active</code> automatically deactivates whichever year was active before.
      </p>
    </>
  );
}
