-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(26) NOT NULL,
    `fromUserId` VARCHAR(26) NOT NULL,
    `toUserId` VARCHAR(26) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `sentAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `readAt` DATETIME(6) NULL,
    `parentMessageId` VARCHAR(26) NULL,

    INDEX `Message_toUserId_readAt_idx`(`toUserId`, `readAt`),
    INDEX `Message_fromUserId_sentAt_idx`(`fromUserId`, `sentAt`),
    INDEX `Message_parentMessageId_idx`(`parentMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_parentMessageId_fkey` FOREIGN KEY (`parentMessageId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
