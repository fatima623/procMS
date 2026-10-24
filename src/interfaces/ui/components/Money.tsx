/** Format a Money value (minor units in 10^-4) for human display. */
export function MoneyLabel({ amountMinor, currency }: { amountMinor: string | bigint; currency: string }) {
  const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  const abs = minor < 0n ? -minor : minor;
  const intPart = (abs / 10_000n).toString();
  const fracPart = (abs % 10_000n).toString().padStart(4, '0').slice(0, 2); // display 2dp
  const sign = minor < 0n ? '-' : '';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (
    <span className="mono nowrap">
      {sign}{grouped}.{fracPart} <span className="muted">{currency}</span>
    </span>
  );
}

/**
 * Compact Money display: 1.52 Bn, 149.82 Mn, 486 K, 980 PKR.
 * Takes minor units in 10^-4 and returns a sized number + unit suffix.
 */
export function MoneyCompact({
  amountMinor,
  currency,
  precision = 2,
}: {
  amountMinor: string | bigint;
  currency: string;
  precision?: number;
}) {
  const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  // Convert minor units to a Number for compact formatting. For very large
  // values this is still safe up to ~9e15 (we're in minor units × 10^4).
  const asMainUnit = Number(abs) / 10_000;
  let value = asMainUnit;
  let unit = '';
  if (asMainUnit >= 1_000_000_000) { value = asMainUnit / 1_000_000_000; unit = 'Bn'; }
  else if (asMainUnit >= 1_000_000) { value = asMainUnit / 1_000_000; unit = 'Mn'; }
  else if (asMainUnit >= 1_000)     { value = asMainUnit / 1_000;     unit = 'K';  }
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: precision, minimumFractionDigits: value >= 100 ? 0 : precision });
  return (
    <span className="nowrap">
      {sign}{formatted}{unit ? <span className="muted" style={{ fontWeight: 400 }}> {unit}</span> : null} <span className="muted" style={{ fontWeight: 400 }}>{currency}</span>
    </span>
  );
}
