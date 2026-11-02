import { ulid } from 'ulid';
import { CommitteeKind } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateCommitteeInput,
  AddCommitteeMemberInput,
  RemoveCommitteeMemberInput,
} from '@/interfaces/http/schemas/governance';

/**
 * Committee lifecycle. GRC committees must be composed of an odd number of
 * members (PPRA Rule 48). Membership is a dated range — adding or removing
 * members creates new rows / stamps leftOn rather than deleting history.
 */
export const committeeService = {
  async createCommittee(input: CreateCommitteeInput): Promise<{ id: string }> {
    if (input.kind === CommitteeKind.GRC && input.members.length % 2 === 0) {
      throw new ValidationError('GRC must have an odd number of members (PPRA Rule 48)');
    }
    const seenUserIds = new Set<string>();
    for (const m of input.members) {
      if (seenUserIds.has(m.userId)) {
        throw new ValidationError(`Duplicate member userId ${m.userId}`);
      }
      seenUserIds.add(m.userId);
    }
    const id = ulid();
    await prisma.$transaction(async (tx) => {
      await tx.committee.create({
        data: {
          id,
          kind: input.kind,
          name: input.name,
          termStart: input.termStart,
          termEnd: input.termEnd ?? null,
          notes: input.notes ?? null,
          members: {
            create: input.members.map((m) => ({
              id: ulid(),
              userId: m.userId,
              memberRole: m.memberRole,
              joinedOn: m.joinedOn,
            })),
          },
        },
      });
    });
    return { id };
  },

  async addMember(committeeId: string, input: AddCommitteeMemberInput): Promise<{ id: string }> {
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { id: true, kind: true, members: { where: { leftOn: null }, select: { userId: true } } },
    });
    if (!committee) throw new NotFoundError('Committee', committeeId);
    if (committee.members.some((m) => m.userId === input.userId)) {
      throw new ValidationError('User is already an active member of this committee');
    }
    // For a GRC, adding one member flips parity — enforce odd membership *after* the add.
    if (committee.kind === CommitteeKind.GRC) {
      const newCount = committee.members.length + 1;
      if (newCount % 2 === 0) {
        throw new ValidationError('Adding this member would make the GRC even-sized (PPRA Rule 48). Add two.');
      }
    }
    const id = ulid();
    await prisma.committeeMember.create({
      data: {
        id,
        committeeId,
        userId: input.userId,
        memberRole: input.memberRole,
        joinedOn: input.joinedOn,
      },
    });
    return { id };
  },

  async removeMember(memberId: string, input: RemoveCommitteeMemberInput): Promise<void> {
    const row = await prisma.committeeMember.findUnique({
      where: { id: memberId },
      select: { id: true, leftOn: true, committee: { select: { kind: true, members: { where: { leftOn: null }, select: { id: true } } } } },
    });
    if (!row) throw new NotFoundError('CommitteeMember', memberId);
    if (row.leftOn) throw new ValidationError('Member has already left');
    if (row.committee.kind === CommitteeKind.GRC) {
      const activeAfter = row.committee.members.length - 1;
      if (activeAfter < 1 || activeAfter % 2 === 0) {
        throw new ValidationError('Removing this member would leave the GRC with an even (or zero) membership (PPRA Rule 48). Replace them atomically.');
      }
    }
    await prisma.committeeMember.update({ where: { id: memberId }, data: { leftOn: input.leftOn } });
  },

  async deactivate(committeeId: string): Promise<void> {
    const row = await prisma.committee.findUnique({ where: { id: committeeId }, select: { id: true, isActive: true } });
    if (!row) throw new NotFoundError('Committee', committeeId);
    if (!row.isActive) throw new ValidationError('Committee is already inactive');
    await prisma.committee.update({ where: { id: committeeId }, data: { isActive: false } });
  },
};
