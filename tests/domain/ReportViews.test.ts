import { describe, expect, it, vi } from 'vitest';

// Pure helpers only — keep the DB client (and its env validation) out of the test.
vi.mock('@/infrastructure/db/prisma', () => ({ prisma: {} }));

import {
  compareMonthKeys,
  filterQuery,
  formatDecimal2,
  isReportSlug,
  monthKey,
  monthLabel,
  parseReportFilters,
  percentSpent,
  sumDecimals,
  toChartNumber,
  UNDATED,
} from '@/interfaces/ui/views/ReportViews';

describe('money helpers', () => {
  it('formats with 2 decimals, half-up, thousands separators', () => {
    expect(formatDecimal2('1234567.5')).toBe('1,234,567.50');
    expect(formatDecimal2('0.005')).toBe('0.01');
    expect(formatDecimal2('999.9949')).toBe('999.99');
    expect(formatDecimal2('-1234.5')).toBe('-1,234.50');
    expect(formatDecimal2(null)).toBe('0.00');
  });

  it('sums exactly (no floating-point drift)', () => {
    expect(sumDecimals(['0.1', '0.2']).toString()).toBe('0.3');
    expect(sumDecimals(['9999999999999999.9999', '0.0001']).toString()).toBe('10000000000000000');
    expect(sumDecimals([]).toString()).toBe('0');
  });

  it('% spent = spent ÷ allocated, "—" when nothing allocated', () => {
    expect(percentSpent('425', '1000')).toBe('42.5%');
    expect(percentSpent('1', '3')).toBe('33.3%');
    expect(percentSpent('0', '0')).toBe('—');
    expect(percentSpent('1200', '1000')).toBe('120.0%');
  });

  it('chart numbers are rounded to 2 decimals for drawing', () => {
    expect(toChartNumber('1234.5678')).toBe(1234.57);
    expect(toChartNumber(null)).toBe(0);
  });
});

describe('month helpers', () => {
  it('keys by UTC month and labels with a textual month', () => {
    expect(monthKey(new Date('2026-01-31T23:00:00Z'))).toBe('2026-01');
    expect(monthKey(null)).toBe(UNDATED);
    expect(monthLabel('2026-01')).toBe('Jan 2026');
    expect(monthLabel('2025-12')).toBe('Dec 2025');
    expect(monthLabel(UNDATED)).toBe('Undated');
  });

  it('sorts chronologically with undated last', () => {
    expect(['2026-02', UNDATED, '2025-11', '2026-01'].sort(compareMonthKeys)).toEqual(['2025-11', '2026-01', '2026-02', UNDATED]);
  });
});

describe('filters', () => {
  it('parses, trims and drops blanks', () => {
    const params: Record<string, string> = { fiscalYearId: ' fy1 ', sectionId: '', firmId: 'f9' };
    expect(parseReportFilters((k) => params[k])).toEqual({ fiscalYearId: 'fy1', sectionId: undefined, firmId: 'f9' });
  });

  it('builds the export query string from set filters only', () => {
    expect(filterQuery({ fiscalYearId: 'fy1', firmId: 'f9' })).toBe('fiscalYearId=fy1&firmId=f9');
    expect(filterQuery({})).toBe('');
  });

  it('knows the five report slugs', () => {
    expect(isReportSlug('indent-pipeline')).toBe(true);
    expect(isReportSlug('budget-utilisation')).toBe(true);
    expect(isReportSlug('nope')).toBe(false);
  });
});
