-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(26) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `rank` VARCHAR(60) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `firmId` VARCHAR(26) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` VARCHAR(26) NOT NULL,
    `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP') NOT NULL,

    PRIMARY KEY (`userId`, `role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Section` (
    `id` VARCHAR(26) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `kind` ENUM('INDENTER', 'CR', 'BUDGET', 'COORD', 'ADP', 'SUPTD', 'DP_OFFICE', 'INSPECTORATE', 'OTHER') NOT NULL,
    `parentId` VARCHAR(26) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Section_code_key`(`code`),
    INDEX `Section_kind_idx`(`kind`),
    INDEX `Section_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SectionMember` (
    `userId` VARCHAR(26) NOT NULL,
    `sectionId` VARCHAR(26) NOT NULL,
    `isHead` BOOLEAN NOT NULL DEFAULT false,

    INDEX `SectionMember_sectionId_idx`(`sectionId`),
    PRIMARY KEY (`userId`, `sectionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FiscalYear` (
    `id` VARCHAR(26) NOT NULL,
    `label` VARCHAR(20) NOT NULL,
    `startsOn` DATE NOT NULL,
    `endsOn` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `FiscalYear_label_key`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetHead` (
    `id` VARCHAR(26) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `BudgetHead_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetAllocation` (
    `id` VARCHAR(26) NOT NULL,
    `fiscalYearId` VARCHAR(26) NOT NULL,
    `budgetHeadId` VARCHAR(26) NOT NULL,
    `sectionId` VARCHAR(26) NULL,
    `allocated` DECIMAL(20, 4) NOT NULL,
    `reserved` DECIMAL(20, 4) NOT NULL DEFAULT 0,
    `spent` DECIMAL(20, 4) NOT NULL DEFAULT 0,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `BudgetAllocation_budgetHeadId_idx`(`budgetHeadId`),
    UNIQUE INDEX `BudgetAllocation_fiscalYearId_budgetHeadId_sectionId_key`(`fiscalYearId`, `budgetHeadId`, `sectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Firm` (
    `id` VARCHAR(26) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `ntn` VARCHAR(40) NULL,
    `address` VARCHAR(500) NULL,
    `city` VARCHAR(120) NULL,
    `country` VARCHAR(120) NULL,
    `email` VARCHAR(254) NULL,
    `phone` VARCHAR(60) NULL,
    `isBlacklisted` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Firm_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Indent` (
    `id` VARCHAR(26) NOT NULL,
    `indentNumber` VARCHAR(40) NOT NULL,
    `controlNumber` VARCHAR(40) NULL,
    `subject` VARCHAR(500) NOT NULL,
    `justification` TEXT NULL,
    `type` ENUM('NORMAL', 'PROPRIETY') NOT NULL DEFAULT 'NORMAL',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('DRAFT', 'SUBMITTED', 'CR_RECEIVED', 'BUDGET_CHECK', 'BUDGET_REJECTED', 'COORD_VETTING', 'ADP_VETTING', 'ADP_OBSERVED', 'SUPTD_VETTING', 'INDENT_APPROVAL', 'INDENT_REJECTED', 'CPO_APPROVAL', 'IT_PREPARATION', 'IT_APPROVAL', 'IT_DISPATCHED', 'TECH_OFFERS_OPEN', 'TSR_IN_PROGRESS', 'COMMERCIAL_OPEN', 'CST_PREPARATION', 'CST_APPROVAL', 'PR_ISSUED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `estimatedValue` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `indenterId` VARCHAR(26) NOT NULL,
    `sectionId` VARCHAR(26) NOT NULL,
    `assignedAdpId` VARCHAR(26) NULL,
    `fiscalYearId` VARCHAR(26) NOT NULL,
    `budgetHeadId` VARCHAR(26) NOT NULL,
    `submittedAt` DATETIME(6) NULL,
    `closedAt` DATETIME(6) NULL,
    `cancelledAt` DATETIME(6) NULL,
    `cancelledReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Indent_indentNumber_key`(`indentNumber`),
    UNIQUE INDEX `Indent_controlNumber_key`(`controlNumber`),
    INDEX `Indent_status_idx`(`status`),
    INDEX `Indent_sectionId_idx`(`sectionId`),
    INDEX `Indent_assignedAdpId_idx`(`assignedAdpId`),
    INDEX `Indent_fiscalYearId_budgetHeadId_idx`(`fiscalYearId`, `budgetHeadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndentItem` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `lineNo` INTEGER NOT NULL,
    `itemCode` VARCHAR(80) NULL,
    `description` VARCHAR(1000) NOT NULL,
    `specifications` JSON NULL,
    `quantity` DECIMAL(20, 4) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `estimatedUnitPrice` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',

    INDEX `IndentItem_indentId_idx`(`indentId`),
    UNIQUE INDEX `IndentItem_indentId_lineNo_key`(`indentId`, `lineNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndentStatusHistory` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'SUBMITTED', 'CR_RECEIVED', 'BUDGET_CHECK', 'BUDGET_REJECTED', 'COORD_VETTING', 'ADP_VETTING', 'ADP_OBSERVED', 'SUPTD_VETTING', 'INDENT_APPROVAL', 'INDENT_REJECTED', 'CPO_APPROVAL', 'IT_PREPARATION', 'IT_APPROVAL', 'IT_DISPATCHED', 'TECH_OFFERS_OPEN', 'TSR_IN_PROGRESS', 'COMMERCIAL_OPEN', 'CST_PREPARATION', 'CST_APPROVAL', 'PR_ISSUED', 'CLOSED', 'CANCELLED') NOT NULL,
    `toStatus` ENUM('DRAFT', 'SUBMITTED', 'CR_RECEIVED', 'BUDGET_CHECK', 'BUDGET_REJECTED', 'COORD_VETTING', 'ADP_VETTING', 'ADP_OBSERVED', 'SUPTD_VETTING', 'INDENT_APPROVAL', 'INDENT_REJECTED', 'CPO_APPROVAL', 'IT_PREPARATION', 'IT_APPROVAL', 'IT_DISPATCHED', 'TECH_OFFERS_OPEN', 'TSR_IN_PROGRESS', 'COMMERCIAL_OPEN', 'CST_PREPARATION', 'CST_APPROVAL', 'PR_ISSUED', 'CLOSED', 'CANCELLED') NOT NULL,
    `actorUserId` VARCHAR(26) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `occurredAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `IndentStatusHistory_indentId_occurredAt_idx`(`indentId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalChain` (
    `id` VARCHAR(26) NOT NULL,
    `subject` ENUM('INDENT', 'IT_PROFORMA', 'CST') NOT NULL,
    `subjectId` VARCHAR(26) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `currentIndex` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `completedAt` DATETIME(6) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `ApprovalChain_status_idx`(`status`),
    UNIQUE INDEX `ApprovalChain_subject_subjectId_key`(`subject`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalStep` (
    `id` VARCHAR(26) NOT NULL,
    `chainId` VARCHAR(26) NOT NULL,
    `stepIndex` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP') NOT NULL,
    `assignedUserId` VARCHAR(26) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `decidedByUserId` VARCHAR(26) NULL,
    `decidedAt` DATETIME(6) NULL,
    `comments` TEXT NULL,

    INDEX `ApprovalStep_status_idx`(`status`),
    INDEX `ApprovalStep_assignedUserId_idx`(`assignedUserId`),
    UNIQUE INDEX `ApprovalStep_chainId_stepIndex_key`(`chainId`, `stepIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Observation` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `raisedByUserId` VARCHAR(26) NOT NULL,
    `raisedToUserId` VARCHAR(26) NULL,
    `note` TEXT NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED', 'WITHDRAWN') NOT NULL DEFAULT 'OPEN',
    `resolution` TEXT NULL,
    `resolvedByUserId` VARCHAR(26) NULL,
    `resolvedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Observation_indentId_status_idx`(`indentId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ITPerforma` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `reference` VARCHAR(60) NOT NULL,
    `checklist` JSON NULL,
    `status` ENUM('DRAFT', 'IN_APPROVAL', 'APPROVED', 'DISPATCHED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `dispatchedAt` DATETIME(6) NULL,
    `closingAt` DATETIME(6) NULL,
    `preparedByUserId` VARCHAR(26) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `ITPerforma_indentId_key`(`indentId`),
    UNIQUE INDEX `ITPerforma_reference_key`(`reference`),
    INDEX `ITPerforma_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ITFirmInvite` (
    `itPerformaId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `invitedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`itPerformaId`, `firmId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TechnicalOffer` (
    `id` VARCHAR(26) NOT NULL,
    `itPerformaId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `submittedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `documentKey` VARCHAR(500) NULL,
    `status` ENUM('RECEIVED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'RECEIVED',
    `remarks` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `TechnicalOffer_status_idx`(`status`),
    UNIQUE INDEX `TechnicalOffer_itPerformaId_firmId_key`(`itPerformaId`, `firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TechnicalScrutinyReport` (
    `id` VARCHAR(26) NOT NULL,
    `itPerformaId` VARCHAR(26) NOT NULL,
    `inspectorateUserId` VARCHAR(26) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'QUERIES_RAISED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(6) NULL,
    `completedAt` DATETIME(6) NULL,
    `summary` TEXT NULL,

    UNIQUE INDEX `TechnicalScrutinyReport_itPerformaId_key`(`itPerformaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TSREvaluation` (
    `id` VARCHAR(26) NOT NULL,
    `tsrId` VARCHAR(26) NOT NULL,
    `technicalOfferId` VARCHAR(26) NOT NULL,
    `verdict` ENUM('ACCEPTED', 'REJECTED', 'NEEDS_QUERY') NOT NULL,
    `remarks` TEXT NULL,
    `evaluatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `TSREvaluation_tsrId_technicalOfferId_key`(`tsrId`, `technicalOfferId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TSRQuery` (
    `id` VARCHAR(26) NOT NULL,
    `tsrId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `question` TEXT NOT NULL,
    `response` TEXT NULL,
    `status` ENUM('OPEN', 'ANSWERED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `askedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `answeredAt` DATETIME(6) NULL,

    INDEX `TSRQuery_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommercialOffer` (
    `id` VARCHAR(26) NOT NULL,
    `itPerformaId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `openedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `totalPrice` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `deliveryWeeks` INTEGER NULL,
    `status` ENUM('RECEIVED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'RECEIVED',
    `documentKey` VARCHAR(500) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `CommercialOffer_status_idx`(`status`),
    UNIQUE INDEX `CommercialOffer_itPerformaId_firmId_key`(`itPerformaId`, `firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CST` (
    `id` VARCHAR(26) NOT NULL,
    `itPerformaId` VARCHAR(26) NOT NULL,
    `preparedByUserId` VARCHAR(26) NOT NULL,
    `status` ENUM('DRAFT', 'IN_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `singleQuote` BOOLEAN NOT NULL DEFAULT false,
    `approvalPerformaKey` VARCHAR(500) NULL,
    `approvedAt` DATETIME(6) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `CST_itPerformaId_key`(`itPerformaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CSTLine` (
    `id` VARCHAR(26) NOT NULL,
    `cstId` VARCHAR(26) NOT NULL,
    `commercialOfferId` VARCHAR(26) NOT NULL,
    `rank` INTEGER NOT NULL,
    `recommendedForAward` BOOLEAN NOT NULL DEFAULT false,
    `justification` TEXT NULL,

    INDEX `CSTLine_cstId_rank_idx`(`cstId`, `rank`),
    UNIQUE INDEX `CSTLine_cstId_commercialOfferId_key`(`cstId`, `commercialOfferId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseRequisition` (
    `id` VARCHAR(26) NOT NULL,
    `cstId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `prNumber` VARCHAR(60) NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `faxedAt` DATETIME(6) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACKNOWLEDGED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `PurchaseRequisition_cstId_key`(`cstId`),
    UNIQUE INDEX `PurchaseRequisition_prNumber_key`(`prNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(26) NOT NULL,
    `subject` ENUM('INDENT', 'IT_PROFORMA', 'TECH_OFFER', 'COMMERCIAL_OFFER', 'TSR', 'CST', 'PR', 'OBSERVATION') NOT NULL,
    `subjectId` VARCHAR(26) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `storageKey` VARCHAR(500) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `sizeBytes` BIGINT NOT NULL,
    `checksumSha256` VARCHAR(64) NULL,
    `uploadedByUserId` VARCHAR(26) NOT NULL,
    `uploadedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Attachment_subject_subjectId_idx`(`subject`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(26) NOT NULL,
    `actorUserId` VARCHAR(26) NULL,
    `action` VARCHAR(80) NOT NULL,
    `subjectType` VARCHAR(40) NOT NULL,
    `subjectId` VARCHAR(26) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `occurredAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AuditLog_subjectType_subjectId_occurredAt_idx`(`subjectType`, `subjectId`, `occurredAt`),
    INDEX `AuditLog_actorUserId_occurredAt_idx`(`actorUserId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Section` ADD CONSTRAINT `Section_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Section`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SectionMember` ADD CONSTRAINT `SectionMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SectionMember` ADD CONSTRAINT `SectionMember_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAllocation` ADD CONSTRAINT `BudgetAllocation_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `FiscalYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAllocation` ADD CONSTRAINT `BudgetAllocation_budgetHeadId_fkey` FOREIGN KEY (`budgetHeadId`) REFERENCES `BudgetHead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_indenterId_fkey` FOREIGN KEY (`indenterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_assignedAdpId_fkey` FOREIGN KEY (`assignedAdpId`) REFERENCES `Section`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `FiscalYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_budgetHeadId_fkey` FOREIGN KEY (`budgetHeadId`) REFERENCES `BudgetHead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndentItem` ADD CONSTRAINT `IndentItem_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndentStatusHistory` ADD CONSTRAINT `IndentStatusHistory_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalStep` ADD CONSTRAINT `ApprovalStep_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `ApprovalChain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalStep` ADD CONSTRAINT `ApprovalStep_decidedByUserId_fkey` FOREIGN KEY (`decidedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_raisedByUserId_fkey` FOREIGN KEY (`raisedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_resolvedByUserId_fkey` FOREIGN KEY (`resolvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITPerforma` ADD CONSTRAINT `ITPerforma_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITFirmInvite` ADD CONSTRAINT `ITFirmInvite_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ITFirmInvite` ADD CONSTRAINT `ITFirmInvite_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TechnicalOffer` ADD CONSTRAINT `TechnicalOffer_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TechnicalOffer` ADD CONSTRAINT `TechnicalOffer_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TechnicalScrutinyReport` ADD CONSTRAINT `TechnicalScrutinyReport_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TSREvaluation` ADD CONSTRAINT `TSREvaluation_tsrId_fkey` FOREIGN KEY (`tsrId`) REFERENCES `TechnicalScrutinyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TSREvaluation` ADD CONSTRAINT `TSREvaluation_technicalOfferId_fkey` FOREIGN KEY (`technicalOfferId`) REFERENCES `TechnicalOffer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TSRQuery` ADD CONSTRAINT `TSRQuery_tsrId_fkey` FOREIGN KEY (`tsrId`) REFERENCES `TechnicalScrutinyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TSRQuery` ADD CONSTRAINT `TSRQuery_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommercialOffer` ADD CONSTRAINT `CommercialOffer_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommercialOffer` ADD CONSTRAINT `CommercialOffer_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CST` ADD CONSTRAINT `CST_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CSTLine` ADD CONSTRAINT `CSTLine_cstId_fkey` FOREIGN KEY (`cstId`) REFERENCES `CST`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CSTLine` ADD CONSTRAINT `CSTLine_commercialOfferId_fkey` FOREIGN KEY (`commercialOfferId`) REFERENCES `CommercialOffer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseRequisition` ADD CONSTRAINT `PurchaseRequisition_cstId_fkey` FOREIGN KEY (`cstId`) REFERENCES `CST`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseRequisition` ADD CONSTRAINT `PurchaseRequisition_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_Indent_fk` FOREIGN KEY (`subjectId`) REFERENCES `Indent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
