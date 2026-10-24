import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { searchEverything } from '@/interfaces/ui/views/SearchViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StatusPill, toneForIndentStatus } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search • Procurement' };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireSessionCtx();
  const q = (searchParams.q ?? '').trim();
  const result = q ? await searchEverything(ctx, q) : null;

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Search</h1>
        <div className="grow" />
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input className="input" name="q" placeholder="Search indents + comments…" defaultValue={q} style={{ width: 360 }} autoFocus />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
      </div>
      <p className="muted">
        Case-insensitive match across indent number / control number / subject and every comment body you can see.
      </p>

      {!result && <Empty>Type a term above to search.</Empty>}

      {result && result.indents.length === 0 && result.comments.length === 0 && (
        <Empty>No matches for <strong>{q}</strong> in indents or comments.</Empty>
      )}

      {result && result.indents.length > 0 && (
        <section className="card" style={{ padding: 0 }}>
          <h3 style={{ padding: '18px 20px 0' }}>
            Indents <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({result.totalIndents} total match{result.totalIndents === 1 ? '' : 'es'})</span>
          </h3>
          <table className="table">
            <thead>
              <tr><th>Indent #</th><th>Control #</th><th>Subject</th><th>Status</th></tr>
            </thead>
            <tbody>
              {result.indents.map((h) => (
                <tr key={h.id}>
                  <td className="mono"><Link href={`/indents/${h.indentId}`}>{h.indentNumber}</Link></td>
                  <td className="mono muted">{h.controlNumber ?? '—'}</td>
                  <td><Highlight text={h.subject} needle={q} /></td>
                  <td><StatusPill tone={toneForIndentStatus(h.status)}>{h.status}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {result && result.comments.length > 0 && (
        <section className="card">
          <h3>
            Comments <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({result.totalComments} total match{result.totalComments === 1 ? '' : 'es'})</span>
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {result.comments.map((c) => (
              <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 8 }}>
                  <Link className="mono" href={`/indents/${c.indentId}`}>{c.indentNumber}</Link>
                  <span className="muted" style={{ fontSize: 12 }}>· {c.indentSubject}</span>
                  <div className="grow" />
                  <span className="muted mono" style={{ fontSize: 11 }}><DateLabel iso={c.createdAt} /></span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <strong>{c.authorName}:</strong>{' '}
                  <Highlight text={c.snippet} needle={q} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Inline-highlights every case-insensitive occurrence of `needle` in `text`. */
function Highlight({ text, needle }: { text: string; needle: string }) {
  if (!needle || needle.length < 2) return <>{text}</>;
  const re = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p)
          ? <mark key={i} style={{ background: 'rgba(254, 240, 138, 0.55)', color: 'inherit', padding: '0 2px', borderRadius: 2 }}>{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}
