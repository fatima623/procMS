import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { AllocationForm } from '../AllocationForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New allocation • Admin' };

export default async function NewAllocationPage() {
  await requireRoles([Role.ADMIN]);
  const [fiscalYears, budgetHeads, sections] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } }),
    prisma.budgetHead.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, description: true } }),
    prisma.section.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);
  return (
    <>
      <h1>New budget allocation</h1>
      <AllocationForm mode="create" fiscalYears={fiscalYears} budgetHeads={budgetHeads} sections={sections} />
    </>
  );
}
