-- CreateTable: Committee (PPRA Rule 48 GRC + general TEC/FEC)
CREATE TABLE `Committee` (
    `id` VARCHAR(26) NOT NULL,
    `kind` ENUM('GRC', 'TEC', 'FEC', 'INSPECTION', 'OTHER') NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `termStart` DATE NOT NULL,
    `termEnd` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `Committee_kind_isActive_idx`(`kind`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: CommitteeMember
CREATE TABLE `CommitteeMember` (
    `id` VARCHAR(26) NOT NULL,
    `committeeId` VARCHAR(26) NOT NULL,
    `userId` VARCHAR(26) NOT NULL,
    `memberRole` VARCHAR(80) NOT NULL,
    `joinedOn` DATE NOT NULL,
    `leftOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `CommitteeMember_committeeId_userId_key`(`committeeId`, `userId`),
    INDEX `CommitteeMember_committeeId_idx`(`committeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ContractAmendment (DPP&I-35 Ch XXI)
CREATE TABLE `ContractAmendment` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `scope` ENUM('QTY', 'DP', 'VALUE', 'SPEC', 'OTHER') NOT NULL,
    `summary` TEXT NOT NULL,
    `deltaValue` DECIMAL(20, 4) NULL,
    `deltaCurrency` VARCHAR(3) NULL,
    `requestedOn` DATE NOT NULL,
    `approvedOn` DATE NULL,
    `approvedByUserId` VARCHAR(26) NULL,
    `status` ENUM('PROPOSED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PROPOSED',
    `rejectionReason` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `ContractAmendment_contractId_status_idx`(`contractId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommitteeMember` ADD CONSTRAINT `CommitteeMember_committeeId_fkey` FOREIGN KEY (`committeeId`) REFERENCES `Committee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractAmendment` ADD CONSTRAINT `ContractAmendment_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
