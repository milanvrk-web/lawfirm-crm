CREATE TABLE `revenue_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`value` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_targets_key_unique` UNIQUE(`key`)
);
