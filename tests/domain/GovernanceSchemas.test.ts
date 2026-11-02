import { describe, it, expect } from 'vitest';
import {
  createCommitteeSchema,
  addCommitteeMemberSchema,
  removeCommitteeMemberSchema,
  proposeContractAmendmentSchema,
  approveContractAmendmentSchema,
  rejectContractAmendmentSchema,
} from '@/interfaces/http/schemas/governance';

describe('governance schemas', () => {
  describe('createCommitteeSchema', () => {
    it('requires at least one member', () => {
      expect(() => createCommitteeSchema.parse({
        kind: 'GRC',
        name: 'Grievance 2026',
        termStart: '2026-01-01',
        members: [],
      })).toThrow();
    });
    it('rejects unknown kinds', () => {
      expect(() => createCommitteeSchema.parse({
        kind: 'XYZ',
        name: 'nope',
        termStart: '2026-01-01',
        members: [{ userId: 'u1', memberRole: 'Chair', joinedOn: '2026-01-01' }],
      })).toThrow();
    });
    it('does NOT enforce parity in Zod — that is the service job', () => {
      // Service enforces odd-GRC; schema just shapes the input.
      const parsed = createCommitteeSchema.parse({
        kind: 'GRC',
        name: 'Even GRC',
        termStart: '2026-01-01',
        members: [
          { userId: 'u1', memberRole: 'Chair', joinedOn: '2026-01-01' },
          { userId: 'u2', memberRole: 'Member', joinedOn: '2026-01-01' },
        ],
      });
      expect(parsed.members).toHaveLength(2);
    });
  });

  describe('committee member sub-schemas', () => {
    it('add requires userId, memberRole, joinedOn', () => {
      expect(() => addCommitteeMemberSchema.parse({})).toThrow();
      const parsed = addCommitteeMemberSchema.parse({ userId: 'u1', memberRole: 'Member', joinedOn: '2026-01-01' });
      expect(parsed.joinedOn).toBeInstanceOf(Date);
    });
    it('remove requires leftOn', () => {
      expect(() => removeCommitteeMemberSchema.parse({})).toThrow();
      const parsed = removeCommitteeMemberSchema.parse({ leftOn: '2026-02-01' });
      expect(parsed.leftOn).toBeInstanceOf(Date);
    });
  });

  describe('proposeContractAmendmentSchema', () => {
    it('requires contractId, scope, summary ≥ 10, requestedOn', () => {
      expect(() => proposeContractAmendmentSchema.parse({})).toThrow();
      const parsed = proposeContractAmendmentSchema.parse({
        contractId: 'c1',
        scope: 'VALUE',
        summary: 'Add 25 extra units due to revised fleet requirement.',
        requestedOn: '2026-01-01',
      });
      expect(parsed.scope).toBe('VALUE');
    });
    it('rejects unknown scopes', () => {
      expect(() => proposeContractAmendmentSchema.parse({
        contractId: 'c1',
        scope: 'COLOUR',
        summary: 'A valid-length summary spanning the required minimum.',
        requestedOn: '2026-01-01',
      })).toThrow();
    });
  });

  describe('approve/reject contract amendment', () => {
    it('approve requires approvedOn', () => {
      expect(() => approveContractAmendmentSchema.parse({})).toThrow();
      const parsed = approveContractAmendmentSchema.parse({ approvedOn: '2026-01-15' });
      expect(parsed.approvedOn).toBeInstanceOf(Date);
    });
    it('reject requires rejectionReason ≥ 5 chars', () => {
      expect(() => rejectContractAmendmentSchema.parse({ rejectionReason: 'no' })).toThrow();
      const parsed = rejectContractAmendmentSchema.parse({ rejectionReason: 'Not budgeted.' });
      expect(parsed.rejectionReason).toBe('Not budgeted.');
    });
  });
});
