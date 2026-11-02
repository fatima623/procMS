-- AlterTable: Indent — optional link to a planned item
ALTER TABLE `Indent` ADD COLUMN `plannedItemId` VARCHAR(26) NULL;

-- CreateTable: AnnualProcurementPlan (PPRA Rule 8)
CREATE TABLE `AnnualProcurementPlan` (
    `id` VARCHAR(26) NOT NULL,
    `fiscalYearId` VARCHAR(26) NOT NULL,
    `publishedOn` DATE NULL,
    `publishedByUserId` VARCHAR(26) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    `totalEstimate` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `AnnualProcurementPlan_fiscalYearId_status_key`(`fiscalYearId`, `status`),
    INDEX `AnnualProcurementPlan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AnnualProcurementPlanItem
CREATE TABLE `AnnualProcurementPlanItem` (
    `id` VARCHAR(26) NOT NULL,
    `planId` VARCHAR(26) NOT NULL,
    `budgetHeadId` VARCHAR(26) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `estimatedValue` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `methodHint` ENUM('OPEN_COMPETITIVE_BIDDING', 'LIMITED_BIDDING', 'RFQ', 'DIRECT_CONTRACTING') NULL,
    `categoryHint` ENUM('GOODS', 'WORKS', 'SERVICES') NULL,
    `quarterHint` VARCHAR(2) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `AnnualProcurementPlanItem_planId_idx`(`planId`),
    INDEX `AnnualProcurementPlanItem_budgetHeadId_idx`(`budgetHeadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: BiddingDocumentTemplate (PPRA Rule 23(4))
CREATE TABLE `BiddingDocumentTemplate` (
    `id` VARCHAR(26) NOT NULL,
    `kind` ENUM('GOODS', 'WORKS', 'SERVICES', 'CONSULTANCY') NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `revision` VARCHAR(40) NOT NULL,
    `publishedOn` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `bodyKey` VARCHAR(500) NULL,
    `summary` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `BiddingDocumentTemplate_kind_revision_key`(`kind`, `revision`),
    INDEX `BiddingDocumentTemplate_kind_isActive_idx`(`kind`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Indent.plannedItemId
ALTER TABLE `Indent` ADD CONSTRAINT `Indent_plannedItemId_fkey` FOREIGN KEY (`plannedItemId`) REFERENCES `AnnualProcurementPlanItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnualProcurementPlan` ADD CONSTRAINT `AnnualProcurementPlan_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `FiscalYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnualProcurementPlanItem` ADD CONSTRAINT `AnnualProcurementPlanItem_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `AnnualProcurementPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnualProcurementPlanItem` ADD CONSTRAINT `AnnualProcurementPlanItem_budgetHeadId_fkey` FOREIGN KEY (`budgetHeadId`) REFERENCES `BudgetHead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
