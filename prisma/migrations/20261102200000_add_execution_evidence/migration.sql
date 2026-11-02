-- CreateTable: Insurance (DPP&I-35 Ch XVII)
CREATE TABLE `Insurance` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `kind` ENUM('MARINE', 'WAR_RISK', 'TRANSIT', 'COMPREHENSIVE', 'OTHER') NOT NULL,
    `policyNumber` VARCHAR(60) NOT NULL,
    `insurer` VARCHAR(255) NOT NULL,
    `coverFromDate` DATE NOT NULL,
    `coverToDate` DATE NOT NULL,
    `premium` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Insurance_contractId_idx`(`contractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Shipment (DPP&I-35 Ch XVIII)
CREATE TABLE `Shipment` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `invoiceId` VARCHAR(26) NULL,
    `mode` ENUM('SEA', 'AIR', 'ROAD', 'RAIL', 'COURIER') NOT NULL,
    `blAwbNumber` VARCHAR(80) NOT NULL,
    `dispatchedOn` DATE NOT NULL,
    `receivedOn` DATE NULL,
    `freightForwarder` VARCHAR(255) NULL,
    `originPort` VARCHAR(120) NULL,
    `destinationPort` VARCHAR(120) NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `Shipment_contractId_dispatchedOn_idx`(`contractId`, `dispatchedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: EndUserCertificate (DPP&I-35 Ch XIX)
CREATE TABLE `EndUserCertificate` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `issuedOn` DATE NOT NULL,
    `issuingAuthorityUserId` VARCHAR(26) NOT NULL,
    `endUserOrganisation` VARCHAR(255) NOT NULL,
    `controlledGoodsDesc` TEXT NOT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `EndUserCertificate_contractId_idx`(`contractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AgentCommission (DPP&I-35 Ch XX)
CREATE TABLE `AgentCommission` (
    `id` VARCHAR(26) NOT NULL,
    `contractId` VARCHAR(26) NOT NULL,
    `agentName` VARCHAR(255) NOT NULL,
    `agentFirmId` VARCHAR(26) NULL,
    `percent` DECIMAL(6, 3) NOT NULL,
    `amount` DECIMAL(20, 4) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `disclosedOn` DATE NOT NULL,
    `approvedByUserId` VARCHAR(26) NULL,
    `approvedOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AgentCommission_contractId_idx`(`contractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Insurance` ADD CONSTRAINT `Insurance_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EndUserCertificate` ADD CONSTRAINT `EndUserCertificate_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentCommission` ADD CONSTRAINT `AgentCommission_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
