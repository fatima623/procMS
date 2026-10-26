-- AlterTable
ALTER TABLE `CommercialOffer` ADD COLUMN `bidSecurityAmount` DECIMAL(20, 4) NULL;

-- AlterTable
ALTER TABLE `Indent` ADD COLUMN `category` ENUM('GOODS', 'WORKS', 'SERVICES') NOT NULL DEFAULT 'GOODS',
    ADD COLUMN `isInternational` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `method` ENUM('OPEN_COMPETITIVE_BIDDING', 'LIMITED_BIDDING', 'RFQ', 'DIRECT_CONTRACTING') NOT NULL DEFAULT 'OPEN_COMPETITIVE_BIDDING';

-- CreateTable
CREATE TABLE `Advertisement` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `medium` ENUM('PPRA_WEBSITE', 'NEWSPAPER', 'EPADS', 'OTHER') NOT NULL DEFAULT 'PPRA_WEBSITE',
    `publishedOn` DATE NOT NULL,
    `biddingDocsIssuedOn` DATE NULL,
    `bidSubmissionDeadline` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Advertisement_indentId_idx`(`indentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `purchaseRequisitionId` VARCHAR(26) NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `contractNumber` VARCHAR(60) NOT NULL,
    `value` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `awardedOn` DATE NULL,
    `signedOn` DATE NULL,
    `status` ENUM('SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'TERMINATED') NOT NULL DEFAULT 'SIGNED',
    `takingOverCertifiedOn` DATE NULL,
    `closedOn` DATE NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Contract_indentId_key`(`indentId`),
    UNIQUE INDEX `Contract_purchaseRequisitionId_key`(`purchaseRequisitionId`),
    UNIQUE INDEX `Contract_contractNumber_key`(`contractNumber`),
    INDEX `Contract_firmId_idx`(`firmId`),
    INDEX `Contract_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guarantee` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `type` ENUM('BID_SECURITY', 'PERFORMANCE', 'ADVANCE_PAYMENT') NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `furnishedOn` DATE NULL,
    `expiresOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Guarantee_contractId_type_idx`(`contractId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `invoiceNumber` VARCHAR(60) NOT NULL,
    `receivedOn` DATE NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Invoice_contractId_idx`(`contractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(26) NOT NULL,
    `invoiceId` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `paidOn` DATE NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Payment_contractId_idx`(`contractId`),
    INDEX `Payment_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LetterOfCredit` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `lcNumber` VARCHAR(60) NOT NULL,
    `openedOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `LetterOfCredit_contractId_idx`(`contractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LCAmendment` (
    `id` VARCHAR(26) NOT NULL,
    `letterOfCreditId` VARCHAR(26) NOT NULL,
    `requestedOn` DATE NOT NULL,
    `finalizedOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `LCAmendment_letterOfCreditId_idx`(`letterOfCreditId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Advertisement` ADD CONSTRAINT `Advertisement_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_purchaseRequisitionId_fkey` FOREIGN KEY (`purchaseRequisitionId`) REFERENCES `PurchaseRequisition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guarantee` ADD CONSTRAINT `Guarantee_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LetterOfCredit` ADD CONSTRAINT `LetterOfCredit_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LCAmendment` ADD CONSTRAINT `LCAmendment_letterOfCreditId_fkey` FOREIGN KEY (`letterOfCreditId`) REFERENCES `LetterOfCredit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

