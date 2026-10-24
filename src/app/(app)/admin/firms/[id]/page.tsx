import { notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { AdminFirmService } from '@/application/admin/AdminFirmService';
import { FirmForm } from '../FirmForm';
import { NotFoundError } from '@/domain/errors/DomainError';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit firm • Admin' };

const service = new AdminFirmService();

export default async function EditFirmPage({ params }: { params: { id: string } }) {
  const ctx = await requireRoles([Role.ADMIN]);
  const firm = await service.get(ctx, params.id).catch((e) => { if (e instanceof NotFoundError) return null; throw e; });
  if (!firm) notFound();
  return (
    <>
      <h1>{firm.name}</h1>
      <p className="muted mono">{firm.code}</p>
      <FirmForm
        mode="edit"
        firmId={firm.id}
        initial={{
          code: firm.code,
          name: firm.name,
          ntn: firm.ntn ?? '',
          address: firm.address ?? '',
          city: firm.city ?? '',
          country: firm.country ?? '',
          email: firm.email ?? '',
          phone: firm.phone ?? '',
          isActive: firm.isActive,
          isBlacklisted: firm.isBlacklisted,
        }}
      />
    </>
  );
}
