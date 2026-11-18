-- CreateTable
CREATE TABLE `InternalDemand` (
    `id` VARCHAR(26) NOT NULL,
    `demandNumber` VARCHAR(40) NOT NULL,
    `raisedByUserId` VARCHAR(26) NOT NULL,
    `raisedForSectionId` VARCHAR(26) NOT NULL,
    `raisedOn` DATE NOT NULL,
    `status` ENUM('OPEN', 'ISSUED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `InternalDemand_demandNumber_key`(`demandNumber`),
    INDEX `InternalDemand_status_idx`(`status`),
    INDEX `InternalDemand_raisedForSectionId_idx`(`raisedForSectionId`),
    INDEX `InternalDemand_raisedByUserId_idx`(`raisedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InternalDemandItem` (
    `id` VARCHAR(26) NOT NULL,
    `demandId` VARCHAR(26) NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(20, 4) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `remarks` VARCHAR(500) NULL,

    INDEX `InternalDemandItem_demandId_idx`(`demandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InternalDemand` ADD CONSTRAINT `InternalDemand_raisedByUserId_fkey` FOREIGN KEY (`raisedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalDemand` ADD CONSTRAINT `InternalDemand_raisedForSectionId_fkey` FOREIGN KEY (`raisedForSectionId`) REFERENCES `Section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalDemandItem` ADD CONSTRAINT `InternalDemandItem_demandId_fkey` FOREIGN KEY (`demandId`) REFERENCES `InternalDemand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
