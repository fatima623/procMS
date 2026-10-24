import { AttachmentSubject } from '@prisma/client';
import { ulid } from 'ulid';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors/DomainError';
import type { AuthContext } from '../ports/AuthContext';
import type { AttachmentStorage } from '../ports/AttachmentStorage';
import type { Clock } from '../ports/Clock';
import type { Logger } from '../ports/Logger';

export interface UploadAttachmentDto {
  readonly subject: AttachmentSubject;
  readonly subjectId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
}

export interface UploadAttachmentResult {
  readonly id: string;
  readonly storageKey: string;
  readonly sizeBytes: string;
  readonly checksumSha256: string;
}

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const BLOCKED_EXTS = new Set(['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'scr', 'jar']);

export class UploadAttachmentUseCase {
  constructor(private readonly deps: {
    readonly storage: AttachmentStorage;
    readonly clock: Clock;
    readonly logger: Logger;
  }) {}

  public async execute(ctx: AuthContext, dto: UploadAttachmentDto): Promise<UploadAttachmentResult> {
    if (!ctx.userId) throw new ForbiddenError('Not authenticated');
    if (dto.bytes.byteLength === 0) throw new ValidationError('Empty file');
    if (dto.bytes.byteLength > MAX_SIZE_BYTES) {
      throw new ValidationError(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit`);
    }

    const ext = extractExtension(dto.originalName);
    if (ext && BLOCKED_EXTS.has(ext.toLowerCase())) {
      throw new ValidationError(`File type .${ext} is not permitted`);
    }

    // Authorise against the subject. We use dynamic imports so the use-case
    // itself stays free of Prisma — only the authz check needs the DB.
    const { prisma } = await import('@/infrastructure/db/prisma');
    await assertSubjectAccess(prisma, ctx, dto.subject, dto.subjectId);

    const blob = await this.deps.storage.put(dto.bytes, ext);
    const id = ulid();
    await prisma.attachment.create({
      data: {
        id,
        subject: dto.subject,
        subjectId: dto.subjectId,
        originalName: dto.originalName.slice(0, 255),
        storageKey: blob.storageKey,
        mimeType: dto.mimeType || 'application/octet-stream',
        sizeBytes: blob.sizeBytes,
        checksumSha256: blob.checksumSha256,
        uploadedByUserId: ctx.userId,
        uploadedAt: this.deps.clock.now(),
      },
    });

    await prisma.auditLog.create({
      data: {
        id: ulid(),
        actorUserId: ctx.userId,
        action: 'attachment.uploaded',
        subjectType: dto.subject,
        subjectId: dto.subjectId,
        metadata: {
          attachmentId: id,
          originalName: dto.originalName,
          mimeType: dto.mimeType,
          sizeBytes: blob.sizeBytes.toString(),
        },
      },
    });

    this.deps.logger.info(
      { attachmentId: id, subject: dto.subject, subjectId: dto.subjectId, size: blob.sizeBytes.toString() },
      'attachment uploaded',
    );
    return { id, storageKey: blob.storageKey, sizeBytes: blob.sizeBytes.toString(), checksumSha256: blob.checksumSha256 };
  }
}

function extractExtension(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return null;
  const ext = name.slice(idx + 1);
  if (!/^[a-zA-Z0-9]{1,16}$/.test(ext)) return null;
  return ext;
}

/** Subject-aware access check. Keeps authz within the use-case layer. */
async function assertSubjectAccess(
  prisma: typeof import('@/infrastructure/db/prisma').prisma,
  ctx: AuthContext,
  subject: AttachmentSubject,
  subjectId: string,
): Promise<void> {
  // Admin can attach to anything.
  if (ctx.roles.includes('ADMIN')) return;
  switch (subject) {
    case 'INDENT': {
      const indent = await prisma.indent.findUnique({ where: { id: subjectId }, select: { indenterId: true, sectionId: true, assignedAdpId: true } });
      if (!indent) throw new NotFoundError('Indent', subjectId);
      const canSee =
        indent.indenterId === ctx.userId ||
        ctx.sectionIds.includes(indent.sectionId) ||
        (indent.assignedAdpId !== null && ctx.sectionIds.includes(indent.assignedAdpId));
      if (!canSee) throw new ForbiddenError('Not permitted to attach to this indent');
      return;
    }
    case 'IT_PROFORMA':
    case 'TSR':
    case 'CST':
    case 'PR':
    case 'OBSERVATION':
    case 'TECH_OFFER':
    case 'COMMERCIAL_OFFER':
      // For non-INDENT subjects, require at least a staff role (not firm rep)
      // unless the firm owns the offer/PR. Trimmed down for the demo; a full
      // check would resolve each subject back to the owning indent and apply
      // the Indent policy above.
      if (ctx.roles.length === 0 || (ctx.roles.length === 1 && ctx.roles[0] === 'FIRM_REP')) {
        if (!['TECH_OFFER', 'COMMERCIAL_OFFER', 'PR'].includes(subject)) {
          throw new ForbiddenError('Not permitted to attach to this subject');
        }
      }
      return;
  }
}
