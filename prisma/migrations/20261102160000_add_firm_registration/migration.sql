-- CreateTable: FirmRegistration (PPRA Rules 15–16; DPP&I-35 Ch XXVI)
CREATE TABLE `FirmRegistration` (
    `id` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `submittedOn` DATE NOT NULL,
    `issuedOn` DATE NULL,
    `validUntil` DATE NULL,
    `category` ENUM('GOODS', 'WORKS', 'SERVICES', 'ARMAMENT_AMMUNITION', 'ELECTRONICS', 'VEHICLES', 'MEDICAL', 'TEXTILES', 'AVIATION', 'SHIPBUILDING', 'IT_SOFTWARE', 'OTHER') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `certificateKey` VARCHAR(500) NULL,
    `reviewedByUserId` VARCHAR(26) NULL,
    `reviewNotes` TEXT NULL,
    `revokedOn` DATE NULL,
    `revokedReason` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `FirmRegistration_firmId_category_status_idx`(`firmId`, `category`, `status`),
    INDEX `FirmRegistration_validUntil_status_idx`(`validUntil`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FirmRegistration` ADD CONSTRAINT `FirmRegistration_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
