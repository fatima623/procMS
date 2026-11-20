-- CreateTable
CREATE TABLE `PrePurchaseProposal` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `kind` ENUM('SINGLE_OFFER', 'PROPRIETARY', 'OTHER') NOT NULL,
    `justification` TEXT NOT NULL,
    `recommendedByUserId` VARCHAR(26) NOT NULL,
    `recommendedOn` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `approvalChainId` VARCHAR(26) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `PrePurchaseProposal_indentId_key`(`indentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
