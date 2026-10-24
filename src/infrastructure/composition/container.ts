import { prisma } from '../db/prisma';
import { PrismaUnitOfWork } from '../db/PrismaUnitOfWork';
import { PrismaIndentRepository } from '../repositories/PrismaIndentRepository';
import { UlidFactory } from '../common/UlidFactory';
import { SystemClock } from '../common/SystemClock';
import { rootLogger } from '../logging/pinoLogger';

import { CreateIndentUseCase } from '@/application/indent/CreateIndentUseCase';
import { SubmitIndentUseCase } from '@/application/indent/SubmitIndentUseCase';
import { GetIndentUseCase } from '@/application/indent/GetIndentUseCase';
import { ListIndentsUseCase } from '@/application/indent/ListIndentsUseCase';
import { ActOnApprovalUseCase } from '@/application/approval/ActOnApprovalUseCase';

import { CreateITPerformaUseCase } from '@/application/itproforma/CreateITPerformaUseCase';
import { StartITApprovalUseCase } from '@/application/itproforma/StartITApprovalUseCase';
import { DispatchITUseCase } from '@/application/itproforma/DispatchITUseCase';

import { SubmitTechnicalOfferUseCase } from '@/application/technical/SubmitTechnicalOfferUseCase';

import { StartTSRUseCase } from '@/application/tsr/StartTSRUseCase';
import { EvaluateOfferUseCase } from '@/application/tsr/EvaluateOfferUseCase';
import { RaiseQueryUseCase } from '@/application/tsr/RaiseQueryUseCase';
import { AnswerQueryUseCase } from '@/application/tsr/AnswerQueryUseCase';
import { CompleteTSRUseCase } from '@/application/tsr/CompleteTSRUseCase';

import { OpenCommercialOfferUseCase } from '@/application/commercial/OpenCommercialOfferUseCase';

import { PrepareCSTUseCase } from '@/application/cst/PrepareCSTUseCase';
import { StartCSTApprovalUseCase } from '@/application/cst/StartCSTApprovalUseCase';

import { IssuePRUseCase } from '@/application/pr/IssuePRUseCase';
import { SendPRUseCase } from '@/application/pr/SendPRUseCase';
import { AcknowledgePRUseCase } from '@/application/pr/AcknowledgePRUseCase';
import { ClosePRUseCase } from '@/application/pr/ClosePRUseCase';

import { RaiseObservationUseCase } from '@/application/observation/RaiseObservationUseCase';
import { ResolveObservationsUseCase } from '@/application/observation/ResolveObservationsUseCase';

/**
 * Composition root (manual DI). Call `getContainer()` from a route handler;
 * the result is cached across requests in production.
 */
export interface Container {
  readonly createIndent: CreateIndentUseCase;
  readonly submitIndent: SubmitIndentUseCase;
  readonly getIndent: GetIndentUseCase;
  readonly listIndents: ListIndentsUseCase;
  readonly actOnApproval: ActOnApprovalUseCase;

  readonly createITPerforma: CreateITPerformaUseCase;
  readonly startITApproval: StartITApprovalUseCase;
  readonly dispatchIT: DispatchITUseCase;

  readonly submitTechnicalOffer: SubmitTechnicalOfferUseCase;

  readonly startTSR: StartTSRUseCase;
  readonly evaluateOffer: EvaluateOfferUseCase;
  readonly raiseQuery: RaiseQueryUseCase;
  readonly answerQuery: AnswerQueryUseCase;
  readonly completeTSR: CompleteTSRUseCase;

  readonly openCommercialOffer: OpenCommercialOfferUseCase;

  readonly prepareCST: PrepareCSTUseCase;
  readonly startCSTApproval: StartCSTApprovalUseCase;

  readonly issuePR: IssuePRUseCase;
  readonly sendPR: SendPRUseCase;
  readonly acknowledgePR: AcknowledgePRUseCase;
  readonly closePR: ClosePRUseCase;

  readonly raiseObservation: RaiseObservationUseCase;
  readonly resolveObservations: ResolveObservationsUseCase;
}

let cached: Container | null = null;

export function getContainer(): Container {
  if (cached) return cached;

  const uow = new PrismaUnitOfWork(prisma);
  const ids = new UlidFactory();
  const clock = new SystemClock();
  const logger = rootLogger;

  const indentNumberGenerator = async () => {
    const now = clock.now();
    const y = now.getUTCFullYear();
    return `IND/${y}/${ids.next().slice(-10)}`;
  };

  const nonTxIndents = new PrismaIndentRepository(prisma);

  cached = {
    createIndent: new CreateIndentUseCase({ uow, ids, clock, logger, indentNumberGenerator }),
    submitIndent: new SubmitIndentUseCase({ uow, clock, logger }),
    getIndent: new GetIndentUseCase(nonTxIndents),
    listIndents: new ListIndentsUseCase(nonTxIndents),
    actOnApproval: new ActOnApprovalUseCase({ uow, clock, logger }),

    createITPerforma: new CreateITPerformaUseCase({ uow, ids, clock, logger }),
    startITApproval: new StartITApprovalUseCase({ uow, ids, clock, logger }),
    dispatchIT: new DispatchITUseCase({ uow, clock, logger }),

    submitTechnicalOffer: new SubmitTechnicalOfferUseCase({ uow, ids, clock, logger }),

    startTSR: new StartTSRUseCase({ uow, ids, clock, logger }),
    evaluateOffer: new EvaluateOfferUseCase({ uow, ids, clock, logger }),
    raiseQuery: new RaiseQueryUseCase({ uow, ids, clock, logger }),
    answerQuery: new AnswerQueryUseCase({ uow, clock, logger }),
    completeTSR: new CompleteTSRUseCase({ uow, clock, logger }),

    openCommercialOffer: new OpenCommercialOfferUseCase({ uow, ids, clock, logger }),

    prepareCST: new PrepareCSTUseCase({ uow, ids, clock, logger }),
    startCSTApproval: new StartCSTApprovalUseCase({ uow, ids, clock, logger }),

    issuePR: new IssuePRUseCase({ uow, ids, clock, logger }),
    sendPR: new SendPRUseCase({ uow, clock, logger }),
    acknowledgePR: new AcknowledgePRUseCase({ uow, logger }),
    closePR: new ClosePRUseCase({ uow, logger }),

    raiseObservation: new RaiseObservationUseCase({ uow, clock, logger }),
    resolveObservations: new ResolveObservationsUseCase({ uow, clock, logger }),
  };
  return cached;
}
