CREATE TABLE `crm_members` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'Staff',
	`color` varchar(30) NOT NULL DEFAULT 'oklch(0.55 0.18 250)',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lead_notes` ADD `authorName` varchar(100);