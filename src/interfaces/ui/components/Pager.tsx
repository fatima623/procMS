import Link from 'next/link';

/**
 * Shared pager strip used by every list page. Keeps the pager visuals
 * consistent and the "preserve current filters" logic in one place.
 */
export function Pager({
  pathname,
  page,
  pageSize,
  total,
  searchParams,
}: {
  readonly pathname: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  /** All active URL params; `page` is injected automatically. */
  readonly searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <div className="row row-end" style={{ marginTop: 12, gap: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>{total.toLocaleString()} total</span>
      </div>
    );
  }

  const base = Object.fromEntries(
    Object.entries(searchParams).filter(([k, v]) => v !== undefined && v !== '' && k !== 'page'),
  );
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(total, page * pageSize);

  return (
    <div className="row row-end" style={{ marginTop: 12, gap: 8 }}>
      <span className="muted" style={{ fontSize: 12 }}>
        {startRow.toLocaleString()}–{endRow.toLocaleString()} of {total.toLocaleString()} · page {page} / {totalPages}
      </span>
      {page > 1 && <Link className="btn" href={{ pathname, query: { ...base, page: '1' } }}>« First</Link>}
      {page > 1 && <Link className="btn" href={{ pathname, query: { ...base, page: String(page - 1) } }}>‹ Prev</Link>}
      {page < totalPages && <Link className="btn" href={{ pathname, query: { ...base, page: String(page + 1) } }}>Next ›</Link>}
      {page < totalPages && <Link className="btn" href={{ pathname, query: { ...base, page: String(totalPages) } }}>Last »</Link>}
    </div>
  );
}
