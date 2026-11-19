/*
  Warnings:

  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `ApprovalStep` MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF', 'LEGAL_STAFF') NOT NULL;

-- AlterTable
ALTER TABLE `UserRole` DROP PRIMARY KEY,
    MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF', 'LEGAL_STAFF') NOT NULL,
    ADD PRIMARY KEY (`userId`, `role`);

-- CreateTable
CREATE TABLE `CourtCase` (
    `id` VARCHAR(26) NOT NULL,
    `caseNumber` VARCHAR(80) NOT NULL,
    `court` VARCHAR(200) NOT NULL,
    `party` VARCHAR(200) NOT NULL,
    `counterParty` VARCHAR(200) NOT NULL,
    `status` ENUM('PENDING', 'CLOSED', 'DISPOSED_OFF') NOT NULL DEFAULT 'PENDING',
    `relatedIndentId` VARCHAR(26) NULL,
    `relatedContractId` VARCHAR(26) NULL,
    `filedOn` DATE NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `CourtCase_caseNumber_key`(`caseNumber`),
    INDEX `CourtCase_status_filedOn_idx`(`status`, `filedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourtProceeding` (
    `id` VARCHAR(26) NOT NULL,
    `courtCaseId` VARCHAR(26) NOT NULL,
    `hearingDate` DATE NOT NULL,
    `outcome` VARCHAR(500) NOT NULL,
    `nextHearingDate` DATE NULL,
    `notes` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `CourtProceeding_courtCaseId_hearingDate_idx`(`courtCaseId`, `hearingDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CourtProceeding` ADD CONSTRAINT `CourtProceeding_courtCaseId_fkey` FOREIGN KEY (`courtCaseId`) REFERENCES `CourtCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
