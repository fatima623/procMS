import { describe, it, expect } from 'vitest';
import {
  declareBlacklistSchema,
  revokeBlacklistSchema,
  createIntegrityPactSchema,
  counterSignIntegrityPactSchema,
  fileGrievanceSchema,
  decideGrievanceSchema,
  appealGrievanceSchema,
  withdrawGrievanceSchema,
} from '@/interfaces/http/schemas/compliance';

/**
 * Schema-level invariants for the compliance-control endpoints. Each schema is
 * the single source of truth for its API contract; a server-side change that
 * loosens a field here would silently loosen the API, so we lock the shape.
 */
describe('compliance schemas', () => {
  describe('declareBlacklistSchema', () => {
    it('requires a firmId, a ground, and a reason ≥ 10 chars', () => {
      expect(() => declareBlacklistSchema.parse({})).toThrow();
      expect(() => declareBlacklistSchema.parse({
        firmId: 'f',
        ground: 'CORRUPT_PRACTICE',
        reason: 'short',
        declaredOn: '2026-01-01',
        effectiveFrom: '2026-01-01',
      })).toThrow();
    });
    it('coerces ISO date strings to Date objects', () => {
      const parsed = declareBlacklistSchema.parse({
        firmId: 'firm1',
        ground: 'CORRUPT_PRACTICE',
        reason: 'A plausibly long reason spanning the required minimum length.',
        declaredOn: '2026-01-02',
        effectiveFrom: '2026-01-03',
      });
      expect(parsed.declaredOn).toBeInstanceOf(Date);
      expect(parsed.effectiveFrom).toBeInstanceOf(Date);
      expect(parsed.effectiveUntil).toBeUndefined();
    });
    it('rejects unknown grounds', () => {
      expect(() => declareBlacklistSchema.parse({
        firmId: 'firm1',
        ground: 'SOMETHING_ELSE',
        reason: 'A plausibly long reason spanning the required minimum length.',
        declaredOn: '2026-01-01',
        effectiveFrom: '2026-01-01',
      })).toThrow();
    });
  });

  describe('revokeBlacklistSchema', () => {
    it('requires revokedOn and a reason', () => {
      expect(() => revokeBlacklistSchema.parse({ revokedOn: '2026-01-01' })).toThrow();
      const parsed = revokeBlacklistSchema.parse({ revokedOn: '2026-01-01', revokedReason: 'short reason given.' });
      expect(parsed.revokedOn).toBeInstanceOf(Date);
    });
  });

  describe('createIntegrityPactSchema', () => {
    it('requires indentId, firmId and signedByBuyerOn', () => {
      expect(() => createIntegrityPactSchema.parse({})).toThrow();
      const parsed = createIntegrityPactSchema.parse({
        indentId: 'i1',
        firmId: 'f1',
        signedByBuyerOn: '2026-01-01',
      });
      expect(parsed.signedByBuyerOn).toBeInstanceOf(Date);
    });
    it('accepts an optional supplier counter-signature date', () => {
      const parsed = createIntegrityPactSchema.parse({
        indentId: 'i1',
        firmId: 'f1',
        signedByBuyerOn: '2026-01-01',
        signedBySupplierOn: '2026-01-10',
      });
      expect(parsed.signedBySupplierOn).toBeInstanceOf(Date);
    });
  });

  describe('counterSignIntegrityPactSchema', () => {
    it('requires a signedBySupplierOn date', () => {
      expect(() => counterSignIntegrityPactSchema.parse({})).toThrow();
      const parsed = counterSignIntegrityPactSchema.parse({ signedBySupplierOn: '2026-01-10' });
      expect(parsed.signedBySupplierOn).toBeInstanceOf(Date);
    });
  });

  describe('fileGrievanceSchema', () => {
    it('defaults stage to PRE_AWARD and allows anonymous (no firmId)', () => {
      const parsed = fileGrievanceSchema.parse({
        indentId: 'i1',
        filedOn: '2026-01-01',
        basis: 'A plausibly long complaint spanning the required minimum.',
      });
      expect(parsed.stage).toBe('PRE_AWARD');
      expect(parsed.firmId).toBeUndefined();
    });
    it('rejects a basis shorter than 10 chars', () => {
      expect(() => fileGrievanceSchema.parse({
        indentId: 'i1',
        filedOn: '2026-01-01',
        basis: 'too short',
      })).toThrow();
    });
  });

  describe('decideGrievanceSchema', () => {
    it('only accepts UPHELD or REJECTED as decision', () => {
      expect(() => decideGrievanceSchema.parse({
        decision: 'PENDING',
        grcDecisionOn: '2026-01-01',
        grcDecisionText: 'A plausibly long decision text.',
      })).toThrow();
      const parsed = decideGrievanceSchema.parse({
        decision: 'UPHELD',
        grcDecisionOn: '2026-01-01',
        grcDecisionText: 'A plausibly long decision text.',
      });
      expect(parsed.decision).toBe('UPHELD');
    });
  });

  describe('appealGrievanceSchema / withdrawGrievanceSchema', () => {
    it('appeal needs appealedToPPRAOn date', () => {
      expect(() => appealGrievanceSchema.parse({})).toThrow();
      const parsed = appealGrievanceSchema.parse({ appealedToPPRAOn: '2026-01-01' });
      expect(parsed.appealedToPPRAOn).toBeInstanceOf(Date);
    });
    it('withdraw allows an optional reason', () => {
      expect(withdrawGrievanceSchema.parse({}).reason).toBeUndefined();
      expect(withdrawGrievanceSchema.parse({ reason: 'duplicate filing' }).reason).toBe('duplicate filing');
    });
  });
});
