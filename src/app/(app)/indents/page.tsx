import Link from 'next/link';
import { Role, IndentStatus, IndentPriority, SectionKind } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listVisibleIndents, loadFilterReferenceData } from '@/interfaces/ui/views/IndentViews';
import { StatusPill, toneForIndentStatus } from '@/interfaces/ui/components/StatusPill';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Indents • Procurement' };
export const dynamic = 'force-dynamic';

const VALID_STATUSES: ReadonlySet<string> = new Set(Object.values(IndentStatus));
const VALID_PRIORITIES: ReadonlySet<string> = new Set(Object.values(IndentPriority));
const ALL_STATUSES = Object.values(IndentStatus);
const ALL_PRIORITIES = Object.values(IndentPriority);

export default async function IndentsPage({ searchParams }: {
  searchParams: {
    page?: string; q?: string;
    status?: string; statuses?: string;      // "a,b,c"
    section?: string; adp?: string; fy?: string; head?: string;
    priority?: string;
    minValue?: string; maxValue?: string;
  };
}) {
  const ctx = await requireSessionCtx();
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const statuses = parseStatuses(searchParams.statuses);
  const legacyStatus = parseStatus(searchParams.status);
  const effectiveStatuses: IndentStatus[] = statuses.length > 0
    ? statuses
    : legacyStatus ? [legacyStatus] : [];

  const [result, refs] = await Promise.all([
    listVisibleIndents(ctx, {
      page,
      search: searchParams.q,
      ...(effectiveStatuses.length ? { statuses: effectiveStatuses } : {}),
      ...(searchParams.section ? { sectionId: searchParams.section } : {}),
      ...(searchParams.adp ? { assignedAdpId: searchParams.adp } : {}),
      ...(searchParams.fy ? { fiscalYearId: searchParams.fy } : {}),
      ...(searchParams.head ? { budgetHeadId: searchParams.head } : {}),
      ...(searchParams.priority && VALID_PRIORITIES.has(searchParams.priority) ? { priority: searchParams.priority } : {}),
      ...(searchParams.minValue ? { minValue: searchParams.minValue } : {}),
      ...(searchParams.maxValue ? { maxValue: searchParams.maxValue } : {}),
    }),
    loadFilterReferenceData(),
  ]);

  const canCreate = ctx.roles.includes(Role.INDENTER) || ctx.roles.includes(Role.ADMIN);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const activeFilterQuery = Object.fromEntries(
    Object.entries(searchParams).filter(([, v]) => v !== undefined && v !== ''),
  );

  const adpSections = refs.sections.filter((s) => s.kind === SectionKind.ADP);
  const indenterSections = refs.sections.filter((s) => s.kind === SectionKind.INDENTER);
  const hasAnyFilter = effectiveStatuses.length > 0 || !!(searchParams.section || searchParams.adp || searchParams.fy || searchParams.head || searchParams.priority || searchParams.minValue || searchParams.maxValue || searchParams.q);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Indents</h1>
        <div className="grow" />
        <a
          className="btn"
          href={`/api/indents/export?${new URLSearchParams(Object.entries(activeFilterQuery) as [string, string][]).toString()}`}
          title="Download current filter as CSV"
        >Export CSV ↓</a>
        {canCreate && <Link href="/indents/new" className="btn btn-primary">+ New indent</Link>}
      </div>

      {/* Filter panel */}
      <details className="card" open={hasAnyFilter} style={{ padding: 0 }}>
        <summary style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
          Filters {hasAnyFilter && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· active</span>}
        </summary>
        <form method="get" style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Search</label>
              <input className="input" name="q" defaultValue={searchParams.q ?? ''} placeholder="indent/control #, subject" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Statuses (hold Ctrl for multi)</label>
              <select className="select" name="statuses" multiple size={5} defaultValue={effectiveStatuses}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Priority</label>
              <select className="select" name="priority" defaultValue={searchParams.priority ?? ''}>
                <option value="">— any —</option>
                {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Fiscal year</label>
              <select className="select" name="fy" defaultValue={searchParams.fy ?? ''}>
                <option value="">— any —</option>
                {refs.fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Budget head</label>
              <select className="select" name="head" defaultValue={searchParams.head ?? ''}>
                <option value="">— any —</option>
                {refs.budgetHeads.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Owning section</label>
              <select className="select" name="section" defaultValue={searchParams.section ?? ''}>
                <option value="">— any —</option>
                {indenterSections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Assigned ADP</label>
              <select className="select" name="adp" defaultValue={searchParams.adp ?? ''}>
                <option value="">— any —</option>
                {adpSections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Value ≥</label>
              <input className="input" type="number" min={0} step="0.01" name="minValue" defaultValue={searchParams.minValue ?? ''} placeholder="min" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Value ≤</label>
              <input className="input" type="number" min={0} step="0.01" name="maxValue" defaultValue={searchParams.maxValue ?? ''} placeholder="max" />
            </div>
          </div>
          <div className="row row-end" style={{ gap: 8, marginTop: 10 }}>
            <Link href="/indents" className="btn">Reset</Link>
            <button className="btn btn-primary" type="submit">Apply filters</button>
          </div>
        </form>
      </details>

      {result.items.length === 0 ? (
        <Empty>
          {hasAnyFilter ? 'No indents match the current filter.' : 'No indents yet.'}
        </Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Indent #</th>
                <th>Control #</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Priority</th>
                <th className="right">Value</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((i) => (
                <tr key={i.id}>
                  <td className="mono"><Link href={`/indents/${i.id}`}>{i.indentNumber}</Link></td>
                  <td className="mono muted">{i.controlNumber ?? '—'}</td>
                  <td>{i.subject}</td>
                  <td><StatusPill tone={toneForIndentStatus(i.status)}>{i.status}</StatusPill></td>
                  <td>{i.priority}</td>
                  <td className="right"><MoneyLabel amountMinor={i.estimatedValueMinor} currency={i.currency} /></td>
                  <td><DateLabel iso={i.submittedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="row row-end" style={{ marginTop: 12, gap: 8 }}>
          <span className="muted">Page {result.page} / {totalPages} ({result.total} total)</span>
          {page > 1 && <Link className="btn" href={{ pathname: '/indents', query: { ...activeFilterQuery, page: page - 1 } }}>Previous</Link>}
          {page < totalPages && <Link className="btn" href={{ pathname: '/indents', query: { ...activeFilterQuery, page: page + 1 } }}>Next</Link>}
        </div>
      )}
    </>
  );
}

function parseStatus(raw: string | undefined): IndentStatus | undefined {
  if (!raw) return undefined;
  return VALID_STATUSES.has(raw) ? (raw as IndentStatus) : undefined;
}
function parseStatuses(raw: string | undefined): IndentStatus[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter((s) => VALID_STATUSES.has(s)) as IndentStatus[];
}
