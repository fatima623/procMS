import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminSectionService } from '@/application/admin/AdminSectionService';
import { prisma } from '@/infrastructure/db/prisma';
import { SectionForm } from '../SectionForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit section • Admin' };

const service = new AdminSectionService();

export default async function EditSectionPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const [section, parents] = await Promise.all([
    service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; }),
    prisma.section.findMany({ where: { id: { not: params.id } }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);
  if (!section) notFound();
  return (
    <>
      <h1>{section.name}</h1>
      <p className="muted mono">{section.code}</p>
      <SectionForm
        mode="edit"
        sectionId={section.id}
        parents={parents}
        initial={{
          code: section.code,
          name: section.name,
          kind: section.kind,
          parentId: section.parentId ?? '',
          isActive: section.isActive,
        }}
      />
    </>
  );
}
