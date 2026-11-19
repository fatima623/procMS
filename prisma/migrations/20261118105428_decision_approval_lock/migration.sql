/*
  Warnings:

  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `ApprovalStep` MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF', 'LEGAL_STAFF', 'COMMUNICATION_STAFF') NOT NULL;

-- AlterTable
ALTER TABLE `Contract` ADD COLUMN `decisionApprovalLocked` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Indent` ADD COLUMN `decisionApprovalLocked` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `UserRole` DROP PRIMARY KEY,
    MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY', 'AUDIT_STAFF', 'LEGAL_STAFF', 'COMMUNICATION_STAFF') NOT NULL,
    ADD PRIMARY KEY (`userId`, `role`);

-- CreateTable
CREATE TABLE `DecisionApprovalEvent` (
    `id` VARCHAR(26) NOT NULL,
    `subjectType` ENUM('INDENT', 'CONTRACT') NOT NULL,
    `subjectId` VARCHAR(26) NOT NULL,
    `action` ENUM('APPROVE', 'UN_APPROVE') NOT NULL,
    `decidedByUserId` VARCHAR(26) NOT NULL,
    `decidedOn` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `remarks` TEXT NULL,

    INDEX `DecisionApprovalEvent_subjectType_subjectId_decidedOn_idx`(`subjectType`, `subjectId`, `decidedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
