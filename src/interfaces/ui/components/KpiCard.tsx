import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Premium per-metric KPI card.
 *
 * Each card carries one accent (indigo/coral/amber/emerald/sky/violet/pink/teal)
 * which colours the top stripe and the icon chip. The accent is purely visual
 * — pick one per metric to give the dashboard a bento-grid feel.
 */
export type Accent = 'indigo' | 'coral' | 'amber' | 'emerald' | 'sky' | 'violet' | 'pink' | 'teal';

export function KpiCard({
  accent,
  icon,
  label,
  value,
  valueColor,
  suffix,
  sub,
  trend,
  href,
}: {
  accent: Accent;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  valueColor?: string;
  suffix?: ReactNode;
  sub?: ReactNode;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  href?: string;
}) {
  const body = (
    <>
      <div className="kpi-head">
        {icon && <span className={`icon-chip c-${accent}`}>{icon}</span>}
        <span className="kpi-label">{label}</span>
        {trend && <span className={`kpi-trend ${trend.direction}`}>{trend.label}</span>}
      </div>
      <div className="kpi-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </>
  );

  const className = `kpi k-${accent}`;
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}

/**
 * Hero card — gradient-tinted feature tile. Use for the "big number" above
 * the KPI row (e.g. pipeline value, awarded value) when a card should stand
 * out from the others.
 */
export function HeroCard({
  accent,
  label,
  value,
  sub,
  footer,
}: {
  accent: Accent;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={`hero-card h-${accent}`}>
      <div className="hero-label">{label}</div>
      <div className="hero-value">{value}</div>
      {sub && <div className="hero-sub">{sub}</div>}
      {footer}
    </div>
  );
}
