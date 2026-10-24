import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyCompact } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const metadata = { title: 'Firm geography • Admin' };
export const dynamic = 'force-dynamic';

interface Bucket {
  readonly key: string;
  readonly label: string;
  readonly firmCount: number;
  readonly activeCount: number;
  readonly blacklistedCount: number;
  readonly prCount: number;
  readonly awardedMinor: bigint;
}

export default async function FirmGeographyPage({ searchParams }: { searchParams: { fy?: string } }) {
  await requireRoles([Role.ADMIN]);

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { startsOn: 'desc' },
    select: { id: true, label: true, isActive: true },
  });
  const selectedFyId = searchParams.fy ?? fiscalYears.find((f) => f.isActive)?.id ?? null;
  const selectedLabel = fiscalYears.find((f) => f.id === selectedFyId)?.label ?? 'All time';

  const [firms, prs] = await Promise.all([
    prisma.firm.findMany({ select: { id: true, city: true, country: true, isActive: true, isBlacklisted: true } }),
    prisma.purchaseRequisition.findMany({
      where: selectedFyId
        ? { cst: { itPerforma: { indent: { fiscalYearId: selectedFyId } } } }
        : {},
      select: { firmId: true, amount: true },
    }),
  ]);

  const prByFirm = new Map<string, { count: number; awarded: bigint }>();
  for (const p of prs) {
    const prev = prByFirm.get(p.firmId) ?? { count: 0, awarded: 0n };
    prev.count += 1;
    prev.awarded += decimalToMinor(p.amount as unknown as string);
    prByFirm.set(p.firmId, prev);
  }

  const cityMap = new Map<string, Bucket>();
  const countryMap = new Map<string, Bucket>();
  for (const f of firms) {
    const city = (f.city ?? '').trim() || 'Unknown';
    const country = (f.country ?? '').trim() || 'Unknown';
    const cityKey = `${country} • ${city}`;
    const stats = prByFirm.get(f.id) ?? { count: 0, awarded: 0n };
    bump(cityMap, cityKey, cityKey, f, stats);
    bump(countryMap, country, country, f, stats);
  }

  const cities = [...cityMap.values()].sort((a, b) => Number(b.awardedMinor - a.awardedMinor) || b.firmCount - a.firmCount);
  const countries = [...countryMap.values()].sort((a, b) => Number(b.awardedMinor - a.awardedMinor) || b.firmCount - a.firmCount);
  const maxFirms = Math.max(1, ...cities.map((c) => c.firmCount));
  const maxAwarded = cities.reduce((m, c) => c.awardedMinor > m ? c.awardedMinor : m, 0n);

  const unknownCount = firms.filter((f) => !f.city || f.city.trim() === '').length;

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Firm geography</h1>
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
        Vendor concentration by location. Awards scoped to <strong>{selectedLabel}</strong>; firm counts show the full registry.
      </p>

      {firms.length === 0 ? (
        <Empty>No firms on file.</Empty>
      ) : (
        <>
          {unknownCount > 0 && (
            <div className="card" style={{ borderLeft: '3px solid var(--warn)' }}>
              <strong>{unknownCount}</strong> firm{unknownCount === 1 ? ' is' : 's are'} missing a city — <Link href="/admin/firms">fix in Firms admin</Link> for better geography.
            </div>
          )}

          <section className="card">
            <h3>By country ({countries.length})</h3>
            {countries.length === 0 ? <div className="muted">No data.</div> : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Country</th><th className="right">Firms</th><th className="right">Active · Blacklisted</th><th className="right">PRs</th><th className="right">Awarded</th></tr>
                </thead>
                <tbody>
                  {countries.map((c) => (
                    <tr key={c.key}>
                      <td className="mono">{c.label}</td>
                      <td className="right mono">{c.firmCount}</td>
                      <td className="right">
                        <span className="mono" style={{ color: 'var(--ok)' }}>{c.activeCount}</span>
                        <span className="muted"> · </span>
                        <span className="mono" style={{ color: c.blacklistedCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{c.blacklistedCount}</span>
                      </td>
                      <td className="right mono">{c.prCount}</td>
                      <td className="right">
                        {c.awardedMinor > 0n ? <MoneyCompact amountMinor={c.awardedMinor.toString()} currency="PKR" precision={1} /> : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h3>Top cities</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Bar width = firm count; colour intensity = awarded value share.</p>
            {cities.length === 0 ? <div className="muted">No data.</div> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {cities.slice(0, 15).map((c) => {
                  const widthPct = (c.firmCount / maxFirms) * 100;
                  const valuePct = maxAwarded === 0n ? 0 : Number((c.awardedMinor * 100n) / maxAwarded);
                  return (
                    <li key={c.key} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 110px 90px', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{c.label}
                        {c.blacklistedCount > 0 && <span style={{ marginLeft: 6 }}><StatusPill tone="danger">{c.blacklistedCount} BL</StatusPill></span>}
                      </span>
                      <div style={{ position: 'relative', height: 10, background: 'var(--bg-input)', borderRadius: 5, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(2, widthPct)}%`, height: '100%', background: `rgba(74, 156, 255, ${0.25 + 0.65 * (valuePct / 100)})` }} />
                      </div>
                      <span className="right mono" style={{ fontSize: 12 }}>{c.firmCount} firm{c.firmCount === 1 ? '' : 's'}</span>
                      <span className="right mono" style={{ fontSize: 12 }}>
                        {c.awardedMinor > 0n ? <MoneyCompact amountMinor={c.awardedMinor.toString()} currency="PKR" precision={1} /> : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

function bump(
  map: Map<string, Bucket>, key: string, label: string,
  firm: { isActive: boolean; isBlacklisted: boolean },
  pr: { count: number; awarded: bigint },
): void {
  const prev = map.get(key) ?? { key, label, firmCount: 0, activeCount: 0, blacklistedCount: 0, prCount: 0, awardedMinor: 0n };
  const next: Bucket = {
    key, label,
    firmCount: prev.firmCount + 1,
    activeCount: prev.activeCount + (firm.isActive && !firm.isBlacklisted ? 1 : 0),
    blacklistedCount: prev.blacklistedCount + (firm.isBlacklisted ? 1 : 0),
    prCount: prev.prCount + pr.count,
    awardedMinor: prev.awardedMinor + pr.awarded,
  };
  map.set(key, next);
}
