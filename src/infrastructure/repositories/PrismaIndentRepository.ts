import { Prisma, type PrismaClient, type Indent as DbIndent, type IndentItem as DbIndentItem } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { Indent } from '@/domain/indent/Indent';
import { IndentItem } from '@/domain/indent/IndentItem';
import { Money } from '@/domain/shared/Money';
import {
  IndentPriority,
  IndentStatus,
  IndentType,
} from '@/domain/indent/IndentStatus';
import type {
  IndentPage,
  IndentRepository,
  ListIndentsFilter,
} from '@/application/ports/IndentRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Converts between the Indent aggregate and its persistence rows.
 *
 * Mapping notes:
 *   - Money is stored as Decimal(20,4). Prisma hands us a `Decimal` instance;
 *     we convert via string → BigInt (minor units) to avoid float drift.
 *   - `version` is Prisma-managed via explicit set + where. Prisma does not
 *     have first-class optimistic concurrency, so we implement it manually.
 */
export class PrismaIndentRepository implements IndentRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<Indent | null> {
    const row = await this.tx.indent.findUnique({
      where: { id },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    if (!row) return null;
    return this.toAggregate(row, row.items);
  }

  public async findByIndentNumber(number: string): Promise<Indent | null> {
    const row = await this.tx.indent.findUnique({
      where: { indentNumber: number },
      include: { items: { orderBy: { lineNo: 'asc' } } },
    });
    if (!row) return null;
    return this.toAggregate(row, row.items);
  }

  public async insert(indent: Indent): Promise<void> {
    await this.tx.indent.create({
      data: {
        id: indent.id,
        indentNumber: indent.indentNumber,
        subject: indent.subject,
        justification: indent.justification ?? null,
        type: indent.type,
        priority: indent.priority,
        status: indent.status,
        estimatedValue: this.minorToDecimal(indent.estimatedValue.amountMinor),
        currency: indent.estimatedValue.currency,
        indenterId: indent.indenterId,
        sectionId: indent.sectionId,
        assignedAdpId: indent.assignedAdpId,
        fiscalYearId: indent.fiscalYearId,
        budgetHeadId: indent.budgetHeadId,
        submittedAt: indent.submittedAt,
        closedAt: indent.closedAt,
        cancelledAt: indent.cancelledAt,
        cancelledReason: indent.cancelledReason,
        version: 0,
        items: {
          create: indent.items.map((it) => ({
            id: it.id,
            lineNo: it.lineNo,
            itemCode: it.itemCode ?? null,
            description: it.description,
            specifications: (it.specifications as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
            quantity: this.minorToDecimal(BigInt(Math.round(it.quantity * 10_000))).toString(),
            uom: it.uom,
            estimatedUnitPrice: this.minorToDecimal(it.estimatedUnitPrice.amountMinor),
            currency: it.estimatedUnitPrice.currency,
          })),
        },
      },
    });
    indent.markPersisted(0);
  }

  public async save(indent: Indent): Promise<void> {
    const expectedVersion = indent.version;
    const result = await this.tx.indent.updateMany({
      where: { id: indent.id, version: expectedVersion },
      data: {
        status: indent.status,
        controlNumber: indent.controlNumber,
        assignedAdpId: indent.assignedAdpId,
        submittedAt: indent.submittedAt,
        closedAt: indent.closedAt,
        cancelledAt: indent.cancelledAt,
        cancelledReason: indent.cancelledReason,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('Indent', indent.id);
    }
    indent.markPersisted(expectedVersion + 1);
  }

  public async list(filter: ListIndentsFilter): Promise<IndentPage> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 25));
    const where: Prisma.IndentWhereInput = {};
    if (filter.statuses?.length) where.status = { in: [...filter.statuses] };
    if (filter.indenterId) where.indenterId = filter.indenterId;
    if (filter.sectionId) where.sectionId = filter.sectionId;
    if (filter.assignedAdpId) where.assignedAdpId = filter.assignedAdpId;
    if (filter.fiscalYearId) where.fiscalYearId = filter.fiscalYearId;
    if (filter.search) {
      const s = filter.search;
      where.OR = [
        { indentNumber: { contains: s } },
        { controlNumber: { contains: s } },
        { subject: { contains: s } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.tx.indent.count({ where }),
      this.tx.indent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { orderBy: { lineNo: 'asc' } } },
      }),
    ]);

    return {
      items: rows.map((r) => this.toAggregate(r, r.items)),
      total,
      page,
      pageSize,
    };
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private toAggregate(row: DbIndent, itemRows: DbIndentItem[]): Indent {
    const items = itemRows.map((ir) =>
      IndentItem.create(ir.id, {
        indentId: ir.indentId,
        lineNo: ir.lineNo,
        itemCode: ir.itemCode ?? undefined,
        description: ir.description,
        specifications: (ir.specifications as Record<string, unknown> | null) ?? undefined,
        quantity: Number(ir.quantity),
        uom: ir.uom,
        estimatedUnitPrice: Money.of(this.decimalToMinor(ir.estimatedUnitPrice as unknown as string), ir.currency),
      }),
    );
    return Indent.rehydrate(row.id, row.version, {
      indentNumber: row.indentNumber,
      subject: row.subject,
      justification: row.justification ?? undefined,
      type: row.type as IndentType,
      priority: row.priority as IndentPriority,
      estimatedValue: Money.of(this.decimalToMinor(row.estimatedValue as unknown as string), row.currency),
      indenterId: row.indenterId,
      sectionId: row.sectionId,
      fiscalYearId: row.fiscalYearId,
      budgetHeadId: row.budgetHeadId,
      status: row.status as IndentStatus,
      controlNumber: row.controlNumber,
      assignedAdpId: row.assignedAdpId,
      items,
      submittedAt: row.submittedAt,
      closedAt: row.closedAt,
      cancelledAt: row.cancelledAt,
      cancelledReason: row.cancelledReason,
      createdAt: row.createdAt,
    });
  }

  /**
   * Decimal(20,4) → minor units (×10 000). We go via string to sidestep JS
   * number precision; Prisma hands us `Decimal` which .toString()s cleanly.
   */
  private decimalToMinor(value: string | number | { toString(): string }): bigint {
    const asStr = typeof value === 'string' ? value : value.toString();
    const [intPart, fracPartRaw = ''] = asStr.split('.');
    const fracPart = (fracPartRaw + '0000').slice(0, 4); // pad or truncate to 4
    return BigInt(intPart ?? '0') * 10_000n + BigInt(fracPart || '0');
  }

  private minorToDecimal(minor: bigint): string {
    const sign = minor < 0n ? '-' : '';
    const abs = minor < 0n ? -minor : minor;
    const intPart = abs / 10_000n;
    const fracPart = (abs % 10_000n).toString().padStart(4, '0');
    return `${sign}${intPart}.${fracPart}`;
  }
}
