'use client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Generic bar chart for the reports (Recharts). Up to 3 series, coloured from
 * the first three validated categorical slots in FIXED order (blue, orange,
 * aqua) — never cycled. Dark is the app default; light steps apply under
 * html[data-theme="light"]. Axis/grid/text use the app's own tokens.
 * Every chart sits beside a table with the same data (the table view).
 */
export interface ChartSeries {
  readonly key: string;
  readonly name: string;
}

const MAX_SERIES = 3;

export function BarChartCard(props: {
  readonly ariaLabel: string;
  readonly data: readonly Record<string, string | number>[];
  readonly categoryKey: string;
  readonly series: readonly ChartSeries[];
  /** "vertical" = horizontal bars with categories down the Y axis (long labels / many rows). */
  readonly layout?: 'horizontal' | 'vertical';
  /** Money tooltips/ticks with 2 decimals. */
  readonly money?: boolean;
  readonly height?: number;
}) {
  const series = props.series.slice(0, MAX_SERIES);
  const vertical = props.layout === 'vertical';
  const height = props.height ?? (vertical ? Math.max(160, props.data.length * (series.length > 1 ? 34 : 26) + 60) : 300);
  const fmt = (v: unknown) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', props.money ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })
      : String(v);
  const tick = { fill: 'var(--text-dim)', fontSize: 11 };
  const radius: [number, number, number, number] = vertical ? [0, 4, 4, 0] : [4, 4, 0, 0];

  if (props.data.length === 0) return <p className="muted">No data to chart.</p>;

  return (
    <div className="viz-root" role="img" aria-label={props.ariaLabel} style={{ width: '100%', height }}>
      <style>{`
        .viz-root { --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; }
        :root[data-theme="light"] .viz-root { --series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; }
        .viz-root .recharts-tooltip-wrapper .recharts-default-tooltip {
          background: var(--bg-elevated) !important; border: 1px solid var(--border-strong) !important; border-radius: 6px;
          color: var(--text) !important; font-size: 12px;
        }
        .viz-root .recharts-legend-item-text { color: var(--text-dim) !important; }
      `}</style>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
        <BarChart
          data={props.data as Record<string, string | number>[]}
          layout={vertical ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, bottom: 8, left: vertical ? 8 : 0 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid stroke="var(--border)" vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={tick} tickFormatter={fmt} stroke="var(--border-strong)" allowDecimals={false} />
              <YAxis type="category" dataKey={props.categoryKey} tick={tick} width={170} stroke="var(--border-strong)" interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey={props.categoryKey} tick={tick} stroke="var(--border-strong)" interval={0} />
              <YAxis tick={tick} tickFormatter={fmt} stroke="var(--border-strong)" allowDecimals={false} width={props.money ? 90 : 40} />
            </>
          )}
          <Tooltip formatter={(v) => fmt(v)} cursor={{ fill: 'var(--bg-hover)' }} />
          {series.length >= 2 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={`var(--series-${i + 1})`} radius={radius} maxBarSize={vertical ? 18 : 36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
