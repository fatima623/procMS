-- AlterTable: CommercialOffer — bid validity date (PPRA Rule 26)
ALTER TABLE `CommercialOffer` ADD COLUMN `bidValidUntil` DATE NULL;
