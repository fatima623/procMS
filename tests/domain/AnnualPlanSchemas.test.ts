import { describe, it, expect } from 'vitest';
import {
  createAnnualPlanSchema,
  publishAnnualPlanSchema,
  createBiddingTemplateSchema,
  retireBiddingTemplateSchema,
} from '@/interfaces/http/schemas/annualPlan';

describe('annual plan + bidding template schemas', () => {
  it('createAnnualPlan requires fiscalYearId + at least one item', () => {
    expect(() => createAnnualPlanSchema.parse({})).toThrow();
    expect(() => createAnnualPlanSchema.parse({
      fiscalYearId: 'fy1',
      items: [],
    })).toThrow();
    const parsed = createAnnualPlanSchema.parse({
      fiscalYearId: 'fy1',
      items: [
        { budgetHeadId: 'bh1', description: 'Qty 10 cases', estimatedValue: 1000 },
      ],
    });
    expect(parsed.items[0]?.currency).toBe('PKR');
    expect(parsed.items[0]?.estimatedValue).toBe('1000');
  });

  it('createAnnualPlan rejects a quarterHint outside Q1-Q4', () => {
    expect(() => createAnnualPlanSchema.parse({
      fiscalYearId: 'fy1',
      items: [
        { budgetHeadId: 'bh1', description: 'Qty 10 cases', estimatedValue: 1000, quarterHint: 'Q5' },
      ],
    })).toThrow();
  });

  it('publishAnnualPlan requires publishedOn date', () => {
    expect(() => publishAnnualPlanSchema.parse({})).toThrow();
    const parsed = publishAnnualPlanSchema.parse({ publishedOn: '2026-07-01' });
    expect(parsed.publishedOn).toBeInstanceOf(Date);
  });

  it('createBiddingTemplate requires kind, name, revision, publishedOn', () => {
    expect(() => createBiddingTemplateSchema.parse({})).toThrow();
    const parsed = createBiddingTemplateSchema.parse({
      kind: 'GOODS',
      name: 'Standard Goods Document',
      revision: '2026-01',
      publishedOn: '2026-01-01',
    });
    expect(parsed.kind).toBe('GOODS');
  });

  it('retireBiddingTemplate reason is optional', () => {
    expect(retireBiddingTemplateSchema.parse({}).reason).toBeUndefined();
    expect(retireBiddingTemplateSchema.parse({ reason: 'Superseded.' }).reason).toBe('Superseded.');
  });
});
