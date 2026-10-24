import type {
  Prisma,
  PrismaClient,
  TechnicalScrutinyReport as DbTSR,
  TSREvaluation as DbEval,
  TSRQuery as DbQuery,
} from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { TSR } from '@/domain/tsr/TSR';
import { TSREvaluation } from '@/domain/tsr/TSREvaluation';
import { TSRQuery } from '@/domain/tsr/TSRQuery';
import type { TSRQueryStatus, TSRStatus, TSRVerdict } from '@/domain/tsr/TSRTypes';
import type { TSRRepository } from '@/application/ports/TSRRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * The TSR aggregate owns two child collections (evaluations, queries). We
 * persist them with upserts keyed on each child's id — simple and correct;
 * the collections are small (≤ a few dozen) so iterate rather than diff.
 */
export class PrismaTSRRepository implements TSRRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<TSR | null> {
    const row = await this.tx.technicalScrutinyReport.findUnique({
      where: { id },
      include: { evaluations: true, queries: true },
    });
    return row ? this.toAggregate(row, row.evaluations, row.queries) : null;
  }

  public async findByIT(itPerformaId: string): Promise<TSR | null> {
    const row = await this.tx.technicalScrutinyReport.findUnique({
      where: { itPerformaId },
      include: { evaluations: true, queries: true },
    });
    return row ? this.toAggregate(row, row.evaluations, row.queries) : null;
  }

  public async insert(tsr: TSR): Promise<void> {
    await this.tx.technicalScrutinyReport.create({
      data: {
        id: tsr.id,
        itPerformaId: tsr.itPerformaId,
        inspectorateUserId: tsr.inspectorateUserId,
        status: tsr.status,
        summary: tsr.summary,
        submittedAt: tsr.submittedAt,
        completedAt: tsr.completedAt,
      },
    });
    // TSR has no version column in the schema; we approximate OCC by always
    // reading-then-writing within the same transaction (serializable guard
    // on the aggregate itself). markPersisted keeps the aggregate honest.
    tsr.markPersisted(0);
  }

  public async save(tsr: TSR): Promise<void> {
    // Update the TSR header
    const result = await this.tx.technicalScrutinyReport.updateMany({
      where: { id: tsr.id },
      data: {
        status: tsr.status,
        summary: tsr.summary,
        submittedAt: tsr.submittedAt,
        completedAt: tsr.completedAt,
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('TSR', tsr.id);
    }

    // Upsert each evaluation
    for (const ev of tsr.evaluations) {
      await this.tx.tSREvaluation.upsert({
        where: { id: ev.id },
        create: {
          id: ev.id,
          tsrId: tsr.id,
          technicalOfferId: ev.technicalOfferId,
          verdict: ev.verdict,
          remarks: ev.remarks,
          evaluatedAt: ev.evaluatedAt,
        },
        update: {
          verdict: ev.verdict,
          remarks: ev.remarks,
        },
      });
    }

    // Upsert each query
    for (const q of tsr.queries) {
      await this.tx.tSRQuery.upsert({
        where: { id: q.id },
        create: {
          id: q.id,
          tsrId: tsr.id,
          firmId: q.firmId,
          question: q.question,
          response: q.response,
          status: q.status,
          askedAt: q.askedAt,
          answeredAt: q.answeredAt,
        },
        update: {
          response: q.response,
          status: q.status,
          answeredAt: q.answeredAt,
        },
      });
    }
    tsr.markPersisted(tsr.version + 1);
  }

  private toAggregate(row: DbTSR, evalRows: DbEval[], queryRows: DbQuery[]): TSR {
    const evaluations = evalRows.map((e) =>
      TSREvaluation.create(e.id, {
        tsrId: e.tsrId,
        technicalOfferId: e.technicalOfferId,
        verdict: e.verdict as TSRVerdict,
        remarks: e.remarks,
        evaluatedAt: e.evaluatedAt,
      }),
    );
    const queries = queryRows.map((q) =>
      TSRQuery.create(q.id, {
        tsrId: q.tsrId,
        firmId: q.firmId,
        question: q.question,
        response: q.response,
        status: q.status as TSRQueryStatus,
        askedAt: q.askedAt,
        answeredAt: q.answeredAt,
      }),
    );
    return TSR.rehydrate(row.id, 0, {
      itPerformaId: row.itPerformaId,
      inspectorateUserId: row.inspectorateUserId,
      status: row.status as TSRStatus,
      summary: row.summary,
      submittedAt: row.submittedAt,
      completedAt: row.completedAt,
      evaluations,
      queries,
      createdAt: new Date(), // TSR has no createdAt column — use current time for the in-memory view
    });
  }
}
