import { NextResponse, type NextRequest } from 'next/server';
import { AttachmentSubject } from '@prisma/client';

import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { enforceRateLimit } from '@/interfaces/http/rateLimit';
import { UploadAttachmentUseCase } from '@/application/attachment/UploadAttachmentUseCase';
import { LocalFsAttachmentStorage } from '@/infrastructure/storage/LocalFsAttachmentStorage';
import { SystemClock } from '@/infrastructure/common/SystemClock';
import { rootLogger } from '@/infrastructure/logging/pinoLogger';
import { ValidationError } from '@/domain/errors/DomainError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const useCase = new UploadAttachmentUseCase({
  storage: LocalFsAttachmentStorage.default(),
  clock: new SystemClock(),
  logger: rootLogger,
});

const VALID_SUBJECTS: ReadonlySet<string> = new Set(Object.values(AttachmentSubject));

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const limited = await enforceRateLimit({
      key: `upload:${ctx.userId}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;
    const form = await req.formData();
    const subject = String(form.get('subject') ?? '');
    const subjectId = String(form.get('subjectId') ?? '');
    const file = form.get('file');
    if (!VALID_SUBJECTS.has(subject)) throw new ValidationError(`Invalid subject: ${subject}`);
    if (!subjectId || subjectId.length !== 26) throw new ValidationError('Invalid subjectId');
    if (!(file instanceof File)) throw new ValidationError('file is required');

    const buf = new Uint8Array(await file.arrayBuffer());
    const result = await useCase.execute(ctx, {
      subject: subject as AttachmentSubject,
      subjectId,
      originalName: file.name || 'upload.bin',
      mimeType: file.type || 'application/octet-stream',
      bytes: buf,
    });

    return NextResponse.json(
      { data: result },
      { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
