import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError } from '@/domain/errors/DomainError';
import type { CreateTelephoneBillInput, MarkPaidInput } from '@/interfaces/http/schemas/telephoneBill';

export const telephoneBillService = {
  async list(filter?: { paid?: boolean }) {
    return prisma.telephoneBill.findMany({
      where:
        filter?.paid === true
          ? { paidOn: { not: null } }
          : filter?.paid === false
          ? { paidOn: null }
          : {},
      orderBy: [{ billMonth: 'desc' }, { createdAt: 'desc' }],
      include: { enteredBy: { select: { displayName: true } } },
    });
  },

  async create(userId: string, input: CreateTelephoneBillInput) {
    const id = ulid();
    await prisma.telephoneBill.create({
      data: {
        id,
        phoneNumber:     input.phoneNumber,
        billMonth:       input.billMonth,
        billAmountMinor: input.billAmountMinor,
        currency:        input.currency ?? 'PKR',
        dueDate:         input.dueDate,
        enteredByUserId: userId,
      },
    });
    return { id };
  },

  async markPaid(id: string, input: MarkPaidInput) {
    const row = await prisma.telephoneBill.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundError('TelephoneBill', id);
    await prisma.telephoneBill.update({ where: { id }, data: { paidOn: input.paidOn } });
  },
};
