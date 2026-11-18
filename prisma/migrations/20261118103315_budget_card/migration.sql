-- CreateTable
CREATE TABLE `BudgetCard` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `controlNumber` VARCHAR(40) NOT NULL,
    `fiscalYearId` VARCHAR(26) NOT NULL,
    `budgetHeadId` VARCHAR(26) NOT NULL,
    `reservedAmount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `preparedByUserId` VARCHAR(26) NOT NULL,
    `preparedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `clearedAt` DATETIME(6) NULL,
    `clearedByUserId` VARCHAR(26) NULL,
    `committedAt` DATETIME(6) NULL,
    `committedByUserId` VARCHAR(26) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `BudgetCard_indentId_key`(`indentId`),
    UNIQUE INDEX `BudgetCard_controlNumber_key`(`controlNumber`),
    INDEX `BudgetCard_fiscalYearId_budgetHeadId_idx`(`fiscalYearId`, `budgetHeadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
