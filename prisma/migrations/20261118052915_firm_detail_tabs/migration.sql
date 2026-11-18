-- CreateTable
CREATE TABLE `FirmFinancial` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `paidUpCapital` DECIMAL(20, 4) NOT NULL,
    `annualTurnover` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `bankName` VARCHAR(255) NOT NULL,
    `bankAccountNumber` VARCHAR(60) NOT NULL,
    `taxStatus` VARCHAR(60) NOT NULL,
    `lastAuditedOn` DATE NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `FirmFinancial_firmId_key`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmItemCatalog` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `itemCode` VARCHAR(60) NULL,
    `category` VARCHAR(120) NOT NULL,
    `addedOn` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmItemCatalog_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmSignatory` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `personName` VARCHAR(255) NOT NULL,
    `designation` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(60) NULL,
    `email` VARCHAR(254) NULL,
    `signatureImageKey` VARCHAR(500) NULL,
    `addedOn` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmSignatory_firmId_isActive_idx`(`firmId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmPartner` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `partnerName` VARCHAR(255) NOT NULL,
    `shareholdingPercent` DECIMAL(5, 2) NOT NULL,
    `addedOn` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `leftOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmPartner_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmAgent` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `agentName` VARCHAR(255) NOT NULL,
    `localAddress` VARCHAR(500) NOT NULL,
    `commissionPercent` DECIMAL(5, 2) NOT NULL,
    `agreementDocumentKey` VARCHAR(500) NULL,
    `agreementFrom` DATE NOT NULL,
    `agreementTo` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmAgent_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmDisciplinaryAction` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `kind` ENUM('WARNING', 'NOTICE', 'PERFORMANCE_FAIL', 'OTHER') NOT NULL,
    `issuedOn` DATE NOT NULL,
    `issuedByUserId` VARCHAR(26) NOT NULL,
    `description` TEXT NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmDisciplinaryAction_firmId_kind_idx`(`firmId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FirmFinancial` ADD CONSTRAINT `FirmFinancial_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmItemCatalog` ADD CONSTRAINT `FirmItemCatalog_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmSignatory` ADD CONSTRAINT `FirmSignatory_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmPartner` ADD CONSTRAINT `FirmPartner_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmAgent` ADD CONSTRAINT `FirmAgent_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmDisciplinaryAction` ADD CONSTRAINT `FirmDisciplinaryAction_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
