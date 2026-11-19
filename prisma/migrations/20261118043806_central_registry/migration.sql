/*
  Warnings:

  - The primary key for the `Userrole` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `ApprovalStep` MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY') NOT NULL;

-- AlterTable
ALTER TABLE `UserRole` DROP PRIMARY KEY,
    MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'CENTRAL_REGISTRY') NOT NULL,
    ADD PRIMARY KEY (`userId`, `role`);

-- CreateTable
CREATE TABLE `OfficialCorrespondence` (
    `id` VARCHAR(26) NOT NULL,
    `direction` ENUM('INWARD', 'OUTWARD') NOT NULL,
    `controlNumber` VARCHAR(40) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `fromParty` VARCHAR(200) NOT NULL,
    `toParty` VARCHAR(200) NOT NULL,
    `receivedOrSentOn` DATE NOT NULL,
    `assignedToUserId` VARCHAR(26) NULL,
    `remarks` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `OfficialCorrespondence_controlNumber_key`(`controlNumber`),
    INDEX `OfficialCorrespondence_direction_receivedOrSentOn_idx`(`direction`, `receivedOrSentOn`),
    INDEX `OfficialCorrespondence_assignedToUserId_idx`(`assignedToUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CorrespondenceMinute` (
    `id` VARCHAR(26) NOT NULL,
    `correspondenceId` VARCHAR(26) NOT NULL,
    `kind` ENUM('IMF', 'EMF') NOT NULL,
    `text` TEXT NOT NULL,
    `authorUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `CorrespondenceMinute_correspondenceId_createdAt_idx`(`correspondenceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostalStamp` (
    `id` VARCHAR(26) NOT NULL,
    `correspondenceId` VARCHAR(26) NULL,
    `denomination` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `usedOn` DATE NOT NULL,
    `enteredByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `PostalStamp_usedOn_idx`(`usedOn`),
    INDEX `PostalStamp_correspondenceId_idx`(`correspondenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CorrespondenceMinute` ADD CONSTRAINT `CorrespondenceMinute_correspondenceId_fkey` FOREIGN KEY (`correspondenceId`) REFERENCES `OfficialCorrespondence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostalStamp` ADD CONSTRAINT `PostalStamp_correspondenceId_fkey` FOREIGN KEY (`correspondenceId`) REFERENCES `OfficialCorrespondence`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
