import { describe, expect, it } from 'vitest';
import { UNAPPROVE_REMARKS_MESSAGE, decisionApprovalSchema } from '@/interfaces/http/schemas/decisionApproval';

describe('decisionApprovalSchema', () => {
  it('APPROVE (lock) needs no remarks; blank remarks count as not set', () => {
    expect(decisionApprovalSchema.parse({ action: 'APPROVE' }).remarks).toBeUndefined();
    expect(decisionApprovalSchema.parse({ action: 'APPROVE', remarks: '   ' }).remarks).toBeUndefined();
    expect(decisionApprovalSchema.parse({ action: 'APPROVE', remarks: ' Final decision ' }).remarks).toBe('Final decision');
  });

  it('UN_APPROVE requires remarks (at least 5 characters), with a clear message', () => {
    for (const remarks of [undefined, '', '   ', 'abc']) {
      const r = decisionApprovalSchema.safeParse({ action: 'UN_APPROVE', remarks });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe(UNAPPROVE_REMARKS_MESSAGE);
    }
    expect(decisionApprovalSchema.parse({ action: 'UN_APPROVE', remarks: 'Reopened for amendment' }).remarks).toBe('Reopened for amendment');
  });

  it('rejects unknown actions and overlong remarks', () => {
    expect(() => decisionApprovalSchema.parse({ action: 'LOCK' })).toThrow();
    expect(() => decisionApprovalSchema.parse({})).toThrow();
    expect(() => decisionApprovalSchema.parse({ action: 'APPROVE', remarks: 'x'.repeat(5001) })).toThrow();
  });
});
