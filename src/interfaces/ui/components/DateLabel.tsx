export function DateLabel({ iso }: { iso: string | Date | null | undefined }) {
  if (!iso) return <span className="muted">—</span>;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  // Date-only format; UTC to avoid server/client hydration mismatch.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return <span className="mono nowrap" title={`${yyyy}-${mm}-${dd}T${hh}:${mi}Z`}>{yyyy}-{mm}-{dd} {hh}:{mi}</span>;
}
