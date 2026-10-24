/**
 * Money value object — always a non-negative amount paired with an ISO-4217
 * currency code. Operations throw on mismatched currencies (no implicit FX).
 *
 * `amountMinor` is a bigint in **10^-4 of the main currency unit** so it
 * round-trips without loss to/from the Decimal(20,4) column used throughout
 * the schema. For PKR that means 100.00 PKR is stored as 1_000_000n.
 *
 * The 4-dp scale is a deliberate choice over the traditional "cents" scale
 * (×100) — it lets us hold unit prices that are themselves fractional
 * (e.g. 0.0375 USD per sheet) without a second conversion step.
 */
export class Money {
  private static readonly ISO_CURRENCY = /^[A-Z]{3}$/;

  private constructor(
    public readonly amountMinor: bigint,
    public readonly currency: string,
  ) {}

  public static of(amountMinor: bigint | number | string, currency: string): Money {
    if (!Money.ISO_CURRENCY.test(currency)) {
      throw new Error(`Invalid currency code: ${currency}`);
    }
    const normalised =
      typeof amountMinor === 'bigint'
        ? amountMinor
        : BigInt(Math.trunc(Number(amountMinor)));
    if (normalised < 0n) {
      throw new Error('Money amount must be non-negative');
    }
    return new Money(normalised, currency);
  }

  public static zero(currency: string): Money {
    return Money.of(0n, currency);
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const next = this.amountMinor - other.amountMinor;
    if (next < 0n) throw new Error('Money subtraction would be negative');
    return new Money(next, this.currency);
  }

  public isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor > other.amountMinor;
  }

  public equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  public toJSON() {
    return { amountMinor: this.amountMinor.toString(), currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }
}
