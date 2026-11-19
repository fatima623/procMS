-- CreateTable
CREATE TABLE `PPRAInvoice` (
    `id` VARCHAR(26) NOT NULL,
    `invoiceNumber` VARCHAR(60) NOT NULL,
    `receivedOn` DATE NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `status` ENUM('RECEIVED', 'RETURNED', 'SENT_TO_DGPRN', 'PAID') NOT NULL DEFAULT 'RECEIVED',
    `returnedReason` TEXT NULL,
    `returnedOn` DATE NULL,
    `sentToDGPRNOn` DATE NULL,
    `paidOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `PPRAInvoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `PPRAInvoice_status_receivedOn_idx`(`status`, `receivedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PPRAInvoiceITLink` (
    `id` VARCHAR(26) NOT NULL,
    `ppraInvoiceId` VARCHAR(26) NOT NULL,
    `itPerformaId` VARCHAR(26) NOT NULL,

    INDEX `PPRAInvoiceITLink_itPerformaId_idx`(`itPerformaId`),
    UNIQUE INDEX `PPRAInvoiceITLink_ppraInvoiceId_itPerformaId_key`(`ppraInvoiceId`, `itPerformaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PPRAInvoiceITLink` ADD CONSTRAINT `PPRAInvoiceITLink_ppraInvoiceId_fkey` FOREIGN KEY (`ppraInvoiceId`) REFERENCES `PPRAInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PPRAInvoiceITLink` ADD CONSTRAINT `PPRAInvoiceITLink_itPerformaId_fkey` FOREIGN KEY (`itPerformaId`) REFERENCES `ITPerforma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
