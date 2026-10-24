import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminSectionService } from '@/application/admin/AdminSectionService';
import { prisma } from '@/infrastructure/db/prisma';
import { KpiCard, type Accent } from '@/interfaces/ui/components/KpiCard';
import { SectionForm } from '../SectionForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit section • Admin' };

const service = new AdminSectionService();

const H_ICON = {
  grid:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  users:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3 3-5 7-5s7 2 7 5"/><path d="M17 11a3 3 0 100-6"/><path d="M22 20c0-2.5-2-4-5-4.5"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
};

export default async function EditSectionPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const [section, parents, memberCount] = await Promise.all([
    service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; }),
    prisma.section.findMany({ where: { id: { not: params.id } }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.sectionMember.count({ where: { sectionId: params.id } }),
  ]);
  if (!section) notFound();
  const activeAccent: Accent = section.isActive ? 'emerald' : 'coral';
  return (
    <>
      <h1>{section.name}</h1>
      <p className="muted mono">{section.code}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"       icon={H_ICON.grid}  label="Kind"    value={section.kind}                sub="Section role in the pipeline" />
        <KpiCard accent="sky"          icon={H_ICON.users} label="Members" value={memberCount}                 sub="Users mapped to this section" />
        <KpiCard accent={activeAccent} icon={H_ICON.check} label="State"   value={section.isActive ? 'Active' : 'Inactive'} sub={section.isActive ? 'In use' : 'Hidden from pickers'} />
      </section>

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
