/**
 * Minimal bar chart for inline trends — pure CSS, no SVG lib. Values are
 * scaled against the max in the series.
 */
export function Sparkbar({
  data,
  valueFmt,
  secondaryFmt,
  height = 110,
}: {
  readonly data: readonly { label: string; value: number; secondary?: string }[];
  readonly valueFmt?: (n: number) => string;
  readonly secondaryFmt?: (s: string) => string;
  readonly height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, padding: '12px 4px', borderBottom: '1px solid var(--border)' }}>
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              <div
                title={`${d.label}: ${valueFmt ? valueFmt(d.value) : d.value}${d.secondary ? ` • ${secondaryFmt ? secondaryFmt(d.secondary) : d.secondary}` : ''}`}
                style={{
                  height: `${Math.max(2, pct)}%`,
                  background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-weak) 100%)',
                  borderRadius: '3px 3px 0 0',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: -16, left: 0, right: 0, textAlign: 'center',
                  fontSize: 11, fontWeight: 600, color: 'var(--text)',
                }}>
                  {valueFmt ? valueFmt(d.value) : d.value}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
