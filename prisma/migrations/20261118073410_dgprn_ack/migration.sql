-- CreateTable
CREATE TABLE `DGPRNAcknowledgement` (
    `id` VARCHAR(26) NOT NULL,
    `invoiceId` VARCHAR(26) NULL,
    `itPerformaId` VARCHAR(26) NULL,
    `receivedOn` DATE NOT NULL,
    `referenceNumber` VARCHAR(80) NOT NULL,
    `remarks` TEXT NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `DGPRNAcknowledgement_invoiceId_idx`(`invoiceId`),
    INDEX `DGPRNAcknowledgement_itPerformaId_idx`(`itPerformaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DGPRNAcknowledgement` ADD CONSTRAINT `DGPRNAcknowledgement_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `PPRAInvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DGPRNAcknowledgement` ADD CONSTRAINT `DGPRNAcknowledgement_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
