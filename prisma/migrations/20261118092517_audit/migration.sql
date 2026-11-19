/*
  Warnings:

  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `ApprovalStep` MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF') NOT NULL;

-- AlterTable
ALTER TABLE `UserRole` DROP PRIMARY KEY,
    MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF') NOT NULL,
    ADD PRIMARY KEY (`userId`, `role`);

-- CreateTable
CREATE TABLE `AuditRecord` (
    `id` VARCHAR(26) NOT NULL,
    `auditSection` VARCHAR(120) NOT NULL,
    `fiscalYearId` VARCHAR(26) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'SETTLED') NOT NULL DEFAULT 'OPEN',
    `subjectIndentId` VARCHAR(26) NULL,
    `subjectContractId` VARCHAR(26) NULL,
    `raisedOn` DATE NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `AuditRecord_status_raisedOn_idx`(`status`, `raisedOn`),
    INDEX `AuditRecord_fiscalYearId_idx`(`fiscalYearId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditObjection` (
    `id` VARCHAR(26) NOT NULL,
    `auditRecordId` VARCHAR(26) NOT NULL,
    `ground` TEXT NOT NULL,
    `para` VARCHAR(40) NOT NULL,
    `amountInvolvedMinor` BIGINT NULL,
    `currency` VARCHAR(3) NULL,
    `status` ENUM('OPEN', 'REPLIED', 'SETTLED') NOT NULL DEFAULT 'OPEN',
    `replyText` TEXT NULL,
    `repliedOn` DATE NULL,
    `repliedByUserId` VARCHAR(26) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AuditObjection_auditRecordId_idx`(`auditRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditItem` (
    `id` VARCHAR(26) NOT NULL,
    `auditRecordId` VARCHAR(26) NOT NULL,
    `itemText` TEXT NOT NULL,
    `status` ENUM('AWAITED', 'REPLY', 'CLEARED') NOT NULL DEFAULT 'AWAITED',
    `replyText` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AuditItem_auditRecordId_idx`(`auditRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditDraftPara` (
    `id` VARCHAR(26) NOT NULL,
    `auditItemId` VARCHAR(26) NOT NULL,
    `paraText` TEXT NOT NULL,
    `submittedOn` DATE NOT NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AuditDraftPara_auditItemId_idx`(`auditItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditItemObjectionLink` (
    `id` VARCHAR(26) NOT NULL,
    `auditItemId` VARCHAR(26) NOT NULL,
    `auditObjectionId` VARCHAR(26) NOT NULL,

    INDEX `AuditItemObjectionLink_auditObjectionId_idx`(`auditObjectionId`),
    UNIQUE INDEX `AuditItemObjectionLink_auditItemId_auditObjectionId_key`(`auditItemId`, `auditObjectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditObjection` ADD CONSTRAINT `AuditObjection_auditRecordId_fkey` FOREIGN KEY (`auditRecordId`) REFERENCES `AuditRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditItem` ADD CONSTRAINT `AuditItem_auditRecordId_fkey` FOREIGN KEY (`auditRecordId`) REFERENCES `AuditRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditDraftPara` ADD CONSTRAINT `AuditDraftPara_auditItemId_fkey` FOREIGN KEY (`auditItemId`) REFERENCES `AuditItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditItemObjectionLink` ADD CONSTRAINT `AuditItemObjectionLink_auditItemId_fkey` FOREIGN KEY (`auditItemId`) REFERENCES `AuditItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditItemObjectionLink` ADD CONSTRAINT `AuditItemObjectionLink_auditObjectionId_fkey` FOREIGN KEY (`auditObjectionId`) REFERENCES `AuditObjection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
