/**
 * Shared converters between Prisma's Decimal(20,4) string representation and
 * our Money/BigInt "minor units in 10^-4" convention. Extracted so every
 * repository that touches money uses the same canonical implementation.
 */
export function decimalToMinor(value: string | number | { toString(): string }): bigint {
  const asStr = typeof value === 'string' ? value : value.toString();
  const neg = asStr.startsWith('-');
  const body = neg ? asStr.slice(1) : asStr;
  const [intPart, fracPartRaw = ''] = body.split('.');
  const fracPart = (fracPartRaw + '0000').slice(0, 4);
  const minor = BigInt(intPart ?? '0') * 10_000n + BigInt(fracPart || '0');
  return neg ? -minor : minor;
}

export function minorToDecimal(minor: bigint): string {
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const intPart = abs / 10_000n;
  const fracPart = (abs % 10_000n).toString().padStart(4, '0');
  return `${sign}${intPart}.${fracPart}`;
}
