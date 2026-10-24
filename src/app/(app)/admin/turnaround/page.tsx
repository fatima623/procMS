import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { loadTurnaround, type TurnaroundStats } from '@/interfaces/ui/views/TurnaroundView';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Turnaround • Admin' };
export const dynamic = 'force-dynamic';

export default async function TurnaroundPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRoles([Role.ADMIN]);
  const fiscalYears = await prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } });
  const selectedFyId = searchParams.fy ?? fiscalYears.find((f) => f.isActive)?.id ?? null;
  const data = await loadTurnaround({ ...(selectedFyId ? { fiscalYearId: selectedFyId } : {}) });
  const selectedLabel = fiscalYears.find((f) => f.id === selectedFyId)?.label ?? 'All time';

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Turnaround</h1>
        <div className="grow" />
        <form method="get" className="row" style={{ gap: 6 }}>
          <label className="dim" style={{ fontSize: 12 }}>Fiscal year</label>
          <select name="fy" className="select" defaultValue={selectedFyId ?? ''} style={{ minWidth: 140 }}>
            <option value="">— All time —</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
          </select>
          <button className="btn" type="submit">Apply</button>
        </form>
      </div>
      <p className="muted">
        How long external parties take to respond. Firms are measured on TSR query replies; indenters on how long they take to resolve ADP observations. Scope: <strong>{selectedLabel}</strong>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
        <TurnaroundCard title="Firm query turnaround" subtitle="TSR query asked → firm replied" stats={data.queries} />
        <TurnaroundCard title="Indenter observation turnaround" subtitle="Observation raised → indenter resolved" stats={data.observations} />
      </div>
    </>
  );
}

function TurnaroundCard({ title, subtitle, stats }: { title: string; subtitle: string; stats: TurnaroundStats }) {
  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.count));
  return (
    <section className="card" style={{ margin: 0 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</p>

      {stats.sampleSize === 0 ? (
        <Empty>No completed samples in this scope.</Empty>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
            <KPI label="Samples" value={String(stats.sampleSize)} />
            <KPI label="Avg" value={`${stats.avgHours} h`} />
            <KPI label="Median" value={`${stats.medianHours} h`} />
            <KPI label="p90" value={`${stats.p90Hours} h`} />
          </div>

          <h4 style={{ marginTop: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Distribution</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {stats.buckets.map((b) => {
              const pct = (b.count / maxBucket) * 100;
              const color = b.minHours >= 72 ? 'var(--danger)' : b.minHours >= 24 ? '#fde047' : 'var(--ok)';
              return (
                <li key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                  <span className="mono" style={{ width: 80, fontSize: 12 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 10, background: 'var(--bg-input)', borderRadius: 5, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: color }} />
                  </div>
                  <span className="mono" style={{ width: 60, textAlign: 'right', fontSize: 12 }}>{b.count}</span>
                  <span className="muted mono" style={{ width: 50, textAlign: 'right', fontSize: 11 }}>{b.pct}%</span>
                </li>
              );
            })}
          </ul>

          {stats.slowest.length > 0 && (
            <>
              <h4 style={{ marginTop: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Slowest 5</h4>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Who</th><th>Subject</th><th className="right">Took</th></tr>
                </thead>
                <tbody>
                  {stats.slowest.map((s) => (
                    <tr key={s.id}>
                      <td>{s.who}</td>
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.href ? <Link href={s.href}>{s.subject}</Link> : s.subject}
                      </td>
                      <td className="right mono" style={{ color: s.hours > 72 ? 'var(--danger)' : 'inherit' }}>{s.hours} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </section>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
      <div className="dim" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
