-- AlterTable
ALTER TABLE `approvalstep` MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'HR_STAFF') NOT NULL;

-- AlterTable
ALTER TABLE `userrole` DROP PRIMARY KEY,
    MODIFY `role` ENUM('ADMIN', 'INDENTER', 'CR_STAFF', 'BUDGET_STAFF', 'COORD_STAFF', 'ADP_STAFF', 'SUPTD', 'AD', 'DD', 'DP_N', 'DGDP', 'SECY_DP', 'CPO', 'INSPECTORATE', 'FIRM_REP', 'HR_STAFF') NOT NULL,
    ADD PRIMARY KEY (`userId`, `role`);

-- CreateTable
CREATE TABLE `InternalProcurement` (
    `id` VARCHAR(26) NOT NULL,
    `reference` VARCHAR(40) NOT NULL,
    `raisedOn` DATE NOT NULL,
    `raisedByUserId` VARCHAR(26) NOT NULL,
    `status` ENUM('DRAFT', 'QUOTED', 'ORDERED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `InternalProcurement_reference_key`(`reference`),
    INDEX `InternalProcurement_status_idx`(`status`),
    INDEX `InternalProcurement_raisedByUserId_idx`(`raisedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InternalProcurementItem` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(20, 4) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,

    INDEX `InternalProcurementItem_procurementId_idx`(`procurementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InternalProcurementInvitedFirm` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,

    INDEX `InternalProcurementInvitedFirm_procurementId_idx`(`procurementId`),
    INDEX `InternalProcurementInvitedFirm_firmId_idx`(`firmId`),
    UNIQUE INDEX `InternalProcurementInvitedFirm_procurementId_firmId_key`(`procurementId`, `firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InternalProcurementQuotation` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `itemId` VARCHAR(26) NOT NULL,
    `quotedPriceMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',

    INDEX `InternalProcurementQuotation_procurementId_idx`(`procurementId`),
    INDEX `InternalProcurementQuotation_firmId_idx`(`firmId`),
    INDEX `InternalProcurementQuotation_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplyOrder` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `orderedOn` DATE NOT NULL,
    `totalValueMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `documentKey` VARCHAR(500) NULL,

    UNIQUE INDEX `SupplyOrder_procurementId_key`(`procurementId`),
    INDEX `SupplyOrder_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SanctionCertificate` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `certificateNumber` VARCHAR(50) NOT NULL,
    `issuedOn` DATE NOT NULL,
    `authority` VARCHAR(100) NOT NULL,
    `documentKey` VARCHAR(500) NULL,

    UNIQUE INDEX `SanctionCertificate_procurementId_key`(`procurementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DebitableVoucher` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `voucherNumber` VARCHAR(50) NOT NULL,
    `amountMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `issuedOn` DATE NOT NULL,

    UNIQUE INDEX `DebitableVoucher_procurementId_key`(`procurementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContingentBill` (
    `id` VARCHAR(26) NOT NULL,
    `procurementId` VARCHAR(26) NOT NULL,
    `firmId` VARCHAR(26) NOT NULL,
    `billNumber` VARCHAR(50) NOT NULL,
    `amountMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `submittedOn` DATE NOT NULL,
    `paidOn` DATE NULL,

    INDEX `ContingentBill_procurementId_idx`(`procurementId`),
    INDEX `ContingentBill_firmId_idx`(`firmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLedgerEntry` (
    `id` VARCHAR(26) NOT NULL,
    `kind` ENUM('ISSUANCE', 'RECEIVING') NOT NULL,
    `happenedOn` DATE NOT NULL,
    `sourceDemandId` VARCHAR(26) NULL,
    `sourceITPerformaId` VARCHAR(26) NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(20, 4) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `enteredByUserId` VARCHAR(26) NOT NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `InventoryLedgerEntry_kind_idx`(`kind`),
    INDEX `InventoryLedgerEntry_happenedOn_idx`(`happenedOn`),
    INDEX `InventoryLedgerEntry_enteredByUserId_idx`(`enteredByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleRequisition` (
    `id` VARCHAR(26) NOT NULL,
    `requisitionNumber` VARCHAR(40) NOT NULL,
    `raisedByUserId` VARCHAR(26) NOT NULL,
    `purpose` TEXT NOT NULL,
    `fromLocation` VARCHAR(255) NOT NULL,
    `toLocation` VARCHAR(255) NOT NULL,
    `requiredFrom` DATETIME(6) NOT NULL,
    `requiredTo` DATETIME(6) NOT NULL,
    `passengerCount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `approvedByUserId` VARCHAR(26) NULL,
    `decidedOn` DATETIME(6) NULL,
    `assignedVehicleRef` VARCHAR(100) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `VehicleRequisition_requisitionNumber_key`(`requisitionNumber`),
    INDEX `VehicleRequisition_status_idx`(`status`),
    INDEX `VehicleRequisition_raisedByUserId_idx`(`raisedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrder` (
    `id` VARCHAR(26) NOT NULL,
    `workOrderNumber` VARCHAR(40) NOT NULL,
    `kind` ENUM('MAINTENANCE', 'REPAIR', 'OTHER') NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `raisedOn` DATE NOT NULL,
    `raisedByUserId` VARCHAR(26) NOT NULL,
    `assignedTo` VARCHAR(100) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `completedOn` DATE NULL,
    `costMinor` BIGINT NULL,
    `currency` VARCHAR(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `WorkOrder_workOrderNumber_key`(`workOrderNumber`),
    INDEX `WorkOrder_status_idx`(`status`),
    INDEX `WorkOrder_raisedByUserId_idx`(`raisedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TelephoneBill` (
    `id` VARCHAR(26) NOT NULL,
    `phoneNumber` VARCHAR(50) NOT NULL,
    `billMonth` VARCHAR(7) NOT NULL,
    `billAmountMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `dueDate` DATE NOT NULL,
    `paidOn` DATE NULL,
    `documentKey` VARCHAR(500) NULL,
    `enteredByUserId` VARCHAR(26) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `TelephoneBill_billMonth_idx`(`billMonth`),
    INDEX `TelephoneBill_enteredByUserId_idx`(`enteredByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(26) NOT NULL,
    `userId` VARCHAR(26) NULL,
    `personnelNumber` VARCHAR(50) NOT NULL,
    `rank` VARCHAR(100) NOT NULL,
    `designation` VARCHAR(100) NOT NULL,
    `section` VARCHAR(100) NOT NULL,
    `dateOfJoining` DATE NOT NULL,
    `dateOfBirth` DATE NOT NULL,
    `bloodGroup` VARCHAR(10) NULL,
    `contact` VARCHAR(50) NULL,
    `maritalStatus` VARCHAR(20) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Employee_userId_key`(`userId`),
    UNIQUE INDEX `Employee_personnelNumber_key`(`personnelNumber`),
    INDEX `Employee_section_idx`(`section`),
    INDEX `Employee_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeServiceRecord` (
    `id` VARCHAR(26) NOT NULL,
    `employeeId` VARCHAR(26) NOT NULL,
    `postingFrom` DATE NOT NULL,
    `postingTo` DATE NULL,
    `section` VARCHAR(100) NOT NULL,
    `remarks` TEXT NULL,

    INDEX `EmployeeServiceRecord_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeLeave` (
    `id` VARCHAR(26) NOT NULL,
    `employeeId` VARCHAR(26) NOT NULL,
    `kind` ENUM('CASUAL', 'EARNED', 'MEDICAL', 'ABSENT') NOT NULL,
    `fromDate` DATE NOT NULL,
    `toDate` DATE NOT NULL,
    `approvedByUserId` VARCHAR(26) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `EmployeeLeave_employeeId_idx`(`employeeId`),
    INDEX `EmployeeLeave_fromDate_toDate_idx`(`fromDate`, `toDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeHouseHiring` (
    `id` VARCHAR(26) NOT NULL,
    `employeeId` VARCHAR(26) NOT NULL,
    `address` TEXT NOT NULL,
    `landlord` VARCHAR(100) NOT NULL,
    `hireStart` DATE NOT NULL,
    `hireEnd` DATE NULL,
    `monthlyRentMinor` BIGINT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'PKR',
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `EmployeeHouseHiring_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeDisciplinaryAction` (
    `id` VARCHAR(26) NOT NULL,
    `employeeId` VARCHAR(26) NOT NULL,
    `kind` VARCHAR(100) NOT NULL,
    `issuedOn` DATE NOT NULL,
    `authority` VARCHAR(100) NOT NULL,
    `decision` TEXT NOT NULL,
    `remarks` TEXT NULL,
    `documentKey` VARCHAR(500) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `EmployeeDisciplinaryAction_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InternalProcurement` ADD CONSTRAINT `InternalProcurement_raisedByUserId_fkey` FOREIGN KEY (`raisedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementItem` ADD CONSTRAINT `InternalProcurementItem_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementInvitedFirm` ADD CONSTRAINT `InternalProcurementInvitedFirm_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementInvitedFirm` ADD CONSTRAINT `InternalProcurementInvitedFirm_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementQuotation` ADD CONSTRAINT `InternalProcurementQuotation_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementQuotation` ADD CONSTRAINT `InternalProcurementQuotation_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InternalProcurementQuotation` ADD CONSTRAINT `InternalProcurementQuotation_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InternalProcurementItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplyOrder` ADD CONSTRAINT `SupplyOrder_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplyOrder` ADD CONSTRAINT `SupplyOrder_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SanctionCertificate` ADD CONSTRAINT `SanctionCertificate_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitableVoucher` ADD CONSTRAINT `DebitableVoucher_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContingentBill` ADD CONSTRAINT `ContingentBill_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `InternalProcurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContingentBill` ADD CONSTRAINT `ContingentBill_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `Firm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLedgerEntry` ADD CONSTRAINT `InventoryLedgerEntry_enteredByUserId_fkey` FOREIGN KEY (`enteredByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleRequisition` ADD CONSTRAINT `VehicleRequisition_raisedByUserId_fkey` FOREIGN KEY (`raisedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleRequisition` ADD CONSTRAINT `VehicleRequisition_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_raisedByUserId_fkey` FOREIGN KEY (`raisedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TelephoneBill` ADD CONSTRAINT `TelephoneBill_enteredByUserId_fkey` FOREIGN KEY (`enteredByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeServiceRecord` ADD CONSTRAINT `EmployeeServiceRecord_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeLeave` ADD CONSTRAINT `EmployeeLeave_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeHouseHiring` ADD CONSTRAINT `EmployeeHouseHiring_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDisciplinaryAction` ADD CONSTRAINT `EmployeeDisciplinaryAction_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
