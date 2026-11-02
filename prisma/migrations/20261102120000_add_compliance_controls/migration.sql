-- CreateTable: Blacklist (PPRA Rule 19)
CREATE TABLE `Blacklist` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `declaredOn` DATE NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveUntil` DATE NULL,
    `ground` ENUM('CORRUPT_PRACTICE', 'FRAUDULENT_PRACTICE', 'COERCIVE_PRACTICE', 'COLLUSIVE_PRACTICE', 'OBSTRUCTIVE_PRACTICE', 'PERFORMANCE_FAILURE', 'BID_DEVIATION', 'OTHER') NOT NULL,
    `reason` TEXT NOT NULL,
    `decidedByUserId` VARCHAR(26) NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `revokedOn` DATE NULL,
    `revokedByUserId` VARCHAR(26) NULL,
    `revokedReason` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `Blacklist_firmId_status_idx`(`firmId`, `status`),
    INDEX `Blacklist_status_effectiveUntil_idx`(`status`, `effectiveUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: IntegrityPact (PPRA Rule 7)
CREATE TABLE `IntegrityPact` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `signedByBuyerUserId` VARCHAR(26) NOT NULL,
    `signedByBuyerOn` DATE NOT NULL,
    `signedBySupplierOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `IntegrityPact_indentId_firmId_key`(`indentId`, `firmId`),
    INDEX `IntegrityPact_indentId_idx`(`indentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Grievance (PPRA Rules 48/50; DPP&I-35 Ch XXVIII)
CREATE TABLE `Grievance` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NULL,
    `filedByUserId` VARCHAR(26) NULL,
    `filedOn` DATE NOT NULL,
    `basis` TEXT NOT NULL,
    `stage` ENUM('PRE_AWARD', 'POST_AWARD') NOT NULL DEFAULT 'PRE_AWARD',
    `status` ENUM('PENDING', 'UPHELD', 'REJECTED', 'WITHDRAWN', 'APPEALED') NOT NULL DEFAULT 'PENDING',
    `grcDecisionOn` DATE NULL,
    `grcDecisionText` TEXT NULL,
    `appealedToPPRAOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `Grievance_indentId_status_idx`(`indentId`, `status`),
    INDEX `Grievance_status_filedOn_idx`(`status`, `filedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Blacklist` ADD CONSTRAINT `Blacklist_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntegrityPact` ADD CONSTRAINT `IntegrityPact_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntegrityPact` ADD CONSTRAINT `IntegrityPact_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grievance` ADD CONSTRAINT `Grievance_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Grievance` ADD CONSTRAINT `Grievance_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
