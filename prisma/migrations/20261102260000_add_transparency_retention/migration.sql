-- CreateTable: MisprocurementIncident (PPRA Rule 50)
CREATE TABLE `MisprocurementIncident` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NULL,
    `ruleReference` VARCHAR(80) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `details` TEXT NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'REMEDIATED', 'REPORTED_TO_PPRA') NOT NULL DEFAULT 'OPEN',
    `detectedOn` DATE NOT NULL,
    `detectedByUserId` VARCHAR(26) NULL,
    `remediatedOn` DATE NULL,
    `reportedToPPRAOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `MisprocurementIncident_indentId_status_idx`(`indentId`, `status`),
    INDEX `MisprocurementIncident_severity_status_idx`(`severity`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: RetentionHold (PPRA Rule 46)
CREATE TABLE `RetentionHold` (
    `id` VARCHAR(26) NOT NULL,
    `subjectType` VARCHAR(40) NOT NULL,
    `subjectId` VARCHAR(26) NOT NULL,
    `reason` ENUM('LITIGATION', 'AUDIT_INQUIRY', 'INVESTIGATION', 'REGULATORY_HOLD', 'OTHER') NOT NULL,
    `placedByUserId` VARCHAR(26) NOT NULL,
    `placedOn` DATE NOT NULL,
    `releasedOn` DATE NULL,
    `releasedByUserId` VARCHAR(26) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `RetentionHold_subjectType_subjectId_idx`(`subjectType`, `subjectId`),
    INDEX `RetentionHold_reason_releasedOn_idx`(`reason`, `releasedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
