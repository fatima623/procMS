import { ulid } from 'ulid';
import { CorrespondenceDirection, Prisma, Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type { AuthContext } from '@/application/ports/AuthContext';
import type {
  AddMinuteInput,
  AssignCorrespondenceInput,
  CreateCorrespondenceInput,
  CreatePostalStampInput,
} from '@/interfaces/http/schemas/registry';

/** Roles that run the Central Registry desk. */
export const REGISTRY_ROLES: Role[] = [Role.ADMIN, Role.CENTRAL_REGISTRY];

export function isRegistryUser(ctx: AuthContext): boolean {
  return REGISTRY_ROLES.some((r) => ctx.roles.includes(r));
}

/**
 * Central Registry service (v4.4.1 §4.5–§4.7): official mail inward/outward,
 * minutes (IMF/EMF) on a letter, and the postal-stamp register.
 *
 * Same shape as ExecutionAdminService: a singleton of small single-write
 * methods; problems surface as DomainErrors so the HTTP mapper renders 4xx.
 */
export const registryService = {
  async createCorrespondence(createdByUserId: string, input: CreateCorrespondenceInput): Promise<{ id: string; controlNumber: string }> {
    if (input.assignedToUserId) await assertActiveUser(input.assignedToUserId);

    let controlNumber = input.controlNumber;
    const autoNumbered = !controlNumber;
    if (controlNumber) {
      const clash = await prisma.officialCorrespondence.findUnique({ where: { controlNumber }, select: { id: true } });
      if (clash) {
        throw new ValidationError(`Control number ${controlNumber} is already used`, { controlNumber: 'duplicate' });
      }
    } else {
      controlNumber = await nextControlNumber(input.direction, input.receivedOrSentOn);
    }

    const id = ulid();
    const insert = (cn: string) =>
      prisma.officialCorrespondence.create({
        data: {
          id,
          direction: input.direction,
          controlNumber: cn,
          subject: input.subject,
          fromParty: input.fromParty,
          toParty: input.toParty,
          receivedOrSentOn: input.receivedOrSentOn,
          assignedToUserId: input.assignedToUserId ?? null,
          remarks: input.remarks?.trim() ? input.remarks.trim() : null,
          documentKey: input.documentKey?.trim() ? input.documentKey.trim() : null,
          createdByUserId,
        },
      });
    try {
      await insert(controlNumber);
    } catch (err) {
      // Two desks auto-numbering at the same moment can pick the same number —
      // allocate a fresh one and retry once. Manual numbers are never retried.
      if (!autoNumbered || !isUniqueViolation(err)) throw err;
      controlNumber = await nextControlNumber(input.direction, input.receivedOrSentOn);
      await insert(controlNumber);
    }
    return { id, controlNumber };
  },

  async assign(id: string, input: AssignCorrespondenceInput): Promise<void> {
    await assertCorrespondence(id);
    if (input.assignedToUserId) await assertActiveUser(input.assignedToUserId);
    await prisma.officialCorrespondence.update({
      where: { id },
      data: { assignedToUserId: input.assignedToUserId, version: { increment: 1 } },
    });
  },

  /** Registry staff, admins, or the officer the letter is assigned to may add minutes. */
  async addMinute(ctx: AuthContext, correspondenceId: string, input: AddMinuteInput): Promise<{ id: string }> {
    const row = await assertCorrespondence(correspondenceId);
    if (!isRegistryUser(ctx) && row.assignedToUserId !== ctx.userId) {
      throw new ForbiddenError('Only Central Registry staff or the assigned officer can add minutes');
    }
    const id = ulid();
    await prisma.correspondenceMinute.create({
      data: { id, correspondenceId, kind: input.kind, text: input.text, authorUserId: ctx.userId },
    });
    return { id };
  },

  async createPostalStamp(enteredByUserId: string, input: CreatePostalStampInput): Promise<{ id: string }> {
    if (input.correspondenceId) {
      const row = await assertCorrespondence(input.correspondenceId);
      if (row.direction !== CorrespondenceDirection.OUTWARD) {
        throw new ValidationError('Postal stamps can only be linked to OUTWARD correspondence', { correspondenceId: 'not_outward' });
      }
    }
    const id = ulid();
    await prisma.postalStamp.create({
      data: {
        id,
        correspondenceId: input.correspondenceId ?? null,
        denomination: input.denomination,
        quantity: input.quantity,
        usedOn: input.usedOn,
        enteredByUserId,
      },
    });
    return { id };
  },
};

async function assertCorrespondence(id: string): Promise<{ id: string; direction: CorrespondenceDirection; assignedToUserId: string | null }> {
  const row = await prisma.officialCorrespondence.findUnique({
    where: { id },
    select: { id: true, direction: true, assignedToUserId: true },
  });
  if (!row) throw new NotFoundError('OfficialCorrespondence', id);
  return row;
}

async function assertActiveUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, firmId: true } });
  if (!user || !user.isActive) throw new NotFoundError('User', userId);
  if (user.firmId) throw new ValidationError('Correspondence cannot be assigned to a firm user', { assignedToUserId: 'firm_user' });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** CR/IN/2026/00001 — running number per direction per calendar year. */
async function nextControlNumber(direction: CorrespondenceDirection, on: Date): Promise<string> {
  const year = on.getUTCFullYear();
  const prefix = `CR/${direction === CorrespondenceDirection.INWARD ? 'IN' : 'OUT'}/${year}/`;
  const last = await prisma.officialCorrespondence.findFirst({
    where: { controlNumber: { startsWith: prefix } },
    orderBy: { controlNumber: 'desc' },
    select: { controlNumber: true },
  });
  let seq = last ? Number.parseInt(last.controlNumber.slice(prefix.length), 10) || 0 : 0;
  // Skip forward past any number already taken (e.g. typed manually).
  for (let attempt = 0; attempt < 20; attempt += 1) {
    seq += 1;
    const candidate = `${prefix}${String(seq).padStart(5, '0')}`;
    const taken = await prisma.officialCorrespondence.findUnique({ where: { controlNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new ValidationError('Could not allocate a control number — please enter one manually', { controlNumber: 'exhausted' });
}
