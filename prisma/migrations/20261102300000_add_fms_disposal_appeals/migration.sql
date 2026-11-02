-- CreateTable: FMSCase (DPP&I-35 Ch XXIV)
CREATE TABLE `FMSCase` (
    `id` VARCHAR(26) NOT NULL,
    `indentId` VARCHAR(26) NOT NULL,
    `caseNumber` VARCHAR(60) NOT NULL,
    `foreignAuthority` VARCHAR(255) NOT NULL,
    `lorSubmittedOn` DATE NULL,
    `loaReceivedOn` DATE NULL,
    `loaAcceptedOn` DATE NULL,
    `loaValue` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `deliveryExpectedBy` DATE NULL,
    `deliveryCompletedOn` DATE NULL,
    `status` ENUM('LOR_SUBMITTED', 'LOA_RECEIVED', 'LOA_ACCEPTED', 'IN_IMPLEMENTATION', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'LOR_SUBMITTED',
    `closedOn` DATE NULL,
    `cancelledReason` TEXT NULL,
    `notes` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `FMSCase_indentId_key`(`indentId`),
    UNIQUE INDEX `FMSCase_caseNumber_key`(`caseNumber`),
    INDEX `FMSCase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: DisposalCase (DPP&I-35 Ch XXV)
CREATE TABLE `DisposalCase` (
    `id` VARCHAR(26) NOT NULL,
    `reference` VARCHAR(60) NOT NULL,
    `kind` ENUM('AUCTION', 'TENDER', 'SCRAP_SALE', 'TRANSFER') NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `initiatedOn` DATE NOT NULL,
    `bidOpensOn` DATE NULL,
    `bidClosesOn` DATE NULL,
    `awardedOn` DATE NULL,
    `completedOn` DATE NULL,
    `status` ENUM('PLANNED', 'OPEN_FOR_BIDS', 'AWARDED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `totalProceeds` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `cancelledReason` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `DisposalCase_reference_key`(`reference`),
    INDEX `DisposalCase_status_bidClosesOn_idx`(`status`, `bidClosesOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: DisposalLot
CREATE TABLE `DisposalLot` (
    `id` VARCHAR(26) NOT NULL,
    `caseId` VARCHAR(26) NOT NULL,
    `lotNumber` INTEGER NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `reservePrice` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `winningBid` DECIMAL(20, 4) NULL,
    `winningBidderName` VARCHAR(255) NULL,
    `winningBidderFirmId` VARCHAR(26) NULL,
    `awardedOn` DATE NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `DisposalLot_caseId_lotNumber_key`(`caseId`, `lotNumber`),
    INDEX `DisposalLot_caseId_idx`(`caseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Appeal (PPRA Rule 50; DPP&I-35 Ch XXVIII)
CREATE TABLE `Appeal` (
    `id` VARCHAR(26) NOT NULL,
    `grievanceId` VARCHAR(26) NOT NULL,
    `filedOn` DATE NOT NULL,
    `filedByUserId` VARCHAR(26) NULL,
    `basis` TEXT NOT NULL,
    `status` ENUM('PENDING', 'UPHELD', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
    `decidedOn` DATE NULL,
    `decisionText` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Appeal_grievanceId_key`(`grievanceId`),
    INDEX `Appeal_status_filedOn_idx`(`status`, `filedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DisposalLot` ADD CONSTRAINT `DisposalLot_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `DisposalCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FMSCase` ADD CONSTRAINT `FMSCase_indentId_fkey` FOREIGN KEY (`indentId`) REFERENCES `Indent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appeal` ADD CONSTRAINT `Appeal_grievanceId_fkey` FOREIGN KEY (`grievanceId`) REFERENCES `Grievance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
