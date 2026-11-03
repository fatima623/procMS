-- AlterTable: User — TOTP (RFC 6238) 2FA fields, declared in the schema but
-- not previously migrated. Both are nullable so existing rows upgrade cleanly.
ALTER TABLE `User` ADD COLUMN `totpSecret` VARCHAR(64) NULL;
ALTER TABLE `User` ADD COLUMN `totpEnabledAt` DATETIME(6) NULL;
