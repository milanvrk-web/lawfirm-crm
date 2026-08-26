ALTER TABLE `leads` ADD `alienNumber` varchar(50) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `dateOfBirth` varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `address` text NULL;--> statement-breakpoint
UPDATE `leads` SET `address` = '' WHERE `address` IS NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `preferredLanguage` varchar(100) DEFAULT '' NOT NULL;