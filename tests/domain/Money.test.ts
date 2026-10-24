import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/shared/Money';

describe('Money', () => {
  it('rejects invalid currency codes', () => {
    expect(() => Money.of(100n, 'pkr')).toThrowError();
    expect(() => Money.of(100n, 'PK')).toThrowError();
  });

  it('rejects negative amounts', () => {
    expect(() => Money.of(-1n, 'PKR')).toThrowError();
  });

  it('adds and subtracts within the same currency', () => {
    const a = Money.of(500n, 'PKR');
    const b = Money.of(300n, 'PKR');
    expect(a.add(b).equals(Money.of(800n, 'PKR'))).toBe(true);
    expect(a.subtract(b).equals(Money.of(200n, 'PKR'))).toBe(true);
  });

  it('refuses cross-currency arithmetic', () => {
    const pkr = Money.of(100n, 'PKR');
    const usd = Money.of(100n, 'USD');
    expect(() => pkr.add(usd)).toThrowError(/Currency mismatch/);
  });

  it('refuses negative subtraction result', () => {
    const a = Money.of(100n, 'PKR');
    const b = Money.of(200n, 'PKR');
    expect(() => a.subtract(b)).toThrowError();
  });
});
