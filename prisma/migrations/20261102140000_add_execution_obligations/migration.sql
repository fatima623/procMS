-- AlterTable: Contract — original delivery period
ALTER TABLE `Contract` ADD COLUMN `originalDP` DATE NULL;

-- CreateTable: DeliveryPeriodExtension (DPP&I-35 Ch XIII)
CREATE TABLE `DeliveryPeriodExtension` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `previousDP` DATE NOT NULL,
    `newDP` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `grantedByUserId` VARCHAR(26) NOT NULL,
    `grantedOn` DATE NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `DeliveryPeriodExtension_contractId_grantedOn_idx`(`contractId`, `grantedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: LiquidatedDamages (DPP&I-35 Ch XIII)
CREATE TABLE `LiquidatedDamages` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `assessedOn` DATE NOT NULL,
    `periodFrom` DATE NOT NULL,
    `periodTo` DATE NOT NULL,
    `basis` ENUM('PER_DAY', 'PER_WEEK', 'PER_MONTH', 'LUMP_SUM') NOT NULL DEFAULT 'PER_MONTH',
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `waivedAmount` DECIMAL(20, 4) NULL,
    `waivedReason` TEXT NULL,
    `assessedByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `LiquidatedDamages_contractId_assessedOn_idx`(`contractId`, `assessedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Inspection (DPP&I-35 Ch XVI)
CREATE TABLE `Inspection` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `performedByUserId` VARCHAR(26) NOT NULL,
    `performedOn` DATE NOT NULL,
    `verdict` ENUM('ACCEPTED', 'DISCREPANCY', 'REJECTED') NOT NULL,
    `summary` TEXT NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Inspection_contractId_performedOn_idx`(`contractId`, `performedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Discrepancy
CREATE TABLE `Discrepancy` (
    `id` VARCHAR(26) NOT NULL,
    `inspectionId` VARCHAR(26) NOT NULL,
    `raisedOn` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `severity` VARCHAR(40) NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED', 'WAIVED') NOT NULL DEFAULT 'OPEN',
    `resolvedOn` DATE NULL,
    `resolutionNotes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `Discrepancy_inspectionId_status_idx`(`inspectionId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeliveryPeriodExtension` ADD CONSTRAINT `DeliveryPeriodExtension_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LiquidatedDamages` ADD CONSTRAINT `LiquidatedDamages_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inspection` ADD CONSTRAINT `Inspection_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discrepancy` ADD CONSTRAINT `Discrepancy_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `Inspection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
