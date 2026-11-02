-- CreateTable: RiskPurchaseCase (DPP&I-35 Ch XXII)
CREATE TABLE `RiskPurchaseCase` (
    `id` VARCHAR(26) NOT NULL,
    `originalContractId` VARCHAR(26) NOT NULL,
    `replacementIndentId` VARCHAR(26) NULL,
    `replacementContractId` VARCHAR(26) NULL,
    `triggerReason` TEXT NOT NULL,
    `initiatedOn` DATE NOT NULL,
    `initiatedByUserId` VARCHAR(26) NOT NULL,
    `status` ENUM('INITIATED', 'REPLACEMENT_AWARDED', 'SETTLED', 'CLOSED') NOT NULL DEFAULT 'INITIATED',
    `riskSettled` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `settledOn` DATE NULL,
    `closedOn` DATE NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `RiskPurchaseCase_originalContractId_key`(`originalContractId`),
    UNIQUE INDEX `RiskPurchaseCase_replacementContractId_key`(`replacementContractId`),
    INDEX `RiskPurchaseCase_status_initiatedOn_idx`(`status`, `initiatedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: FrameworkAgreement (DPP&I-35 Ch XXIII; PPRA Rule 16A)
CREATE TABLE `FrameworkAgreement` (
    `id` VARCHAR(26) NOT NULL,
    `reference` VARCHAR(60) NOT NULL,
    `kind` ENUM('OPEN', 'CLOSED') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` ENUM('GOODS', 'WORKS', 'SERVICES') NOT NULL DEFAULT 'GOODS',
    `validFrom` DATE NOT NULL,
    `validTo` DATE NOT NULL,
    `maxValue` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `status` ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'DRAFT',
    `signedByUserId` VARCHAR(26) NULL,
    `signedOn` DATE NULL,
    `terminatedOn` DATE NULL,
    `terminatedReason` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `FrameworkAgreement_reference_key`(`reference`),
    INDEX `FrameworkAgreement_status_validTo_idx`(`status`, `validTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: FrameworkAgreementFirm
CREATE TABLE `FrameworkAgreementFirm` (
    `id` VARCHAR(26) NOT NULL,
    `frameworkAgreementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `pricingNotes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `FrameworkAgreementFirm_frameworkAgreementId_firmId_key`(`frameworkAgreementId`, `firmId`),
    INDEX `FrameworkAgreementFirm_frameworkAgreementId_idx`(`frameworkAgreementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: CallOffOrder
CREATE TABLE `CallOffOrder` (
    `id` VARCHAR(26) NOT NULL,
    `frameworkAgreementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `callOffNumber` VARCHAR(60) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `placedOn` DATE NOT NULL,
    `fulfilledOn` DATE NULL,
    `status` ENUM('DRAFT', 'PLACED', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'PLACED',
    `cancelledOn` DATE NULL,
    `cancelledReason` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `CallOffOrder_callOffNumber_key`(`callOffNumber`),
    INDEX `CallOffOrder_frameworkAgreementId_placedOn_idx`(`frameworkAgreementId`, `placedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FrameworkAgreementFirm` ADD CONSTRAINT `FrameworkAgreementFirm_frameworkAgreementId_fkey` FOREIGN KEY (`frameworkAgreementId`) REFERENCES `FrameworkAgreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallOffOrder` ADD CONSTRAINT `CallOffOrder_frameworkAgreementId_fkey` FOREIGN KEY (`frameworkAgreementId`) REFERENCES `FrameworkAgreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
