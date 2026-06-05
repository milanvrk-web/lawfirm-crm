CREATE TABLE `daily_briefings` (
	`id` varchar(36) NOT NULL,
	`briefingDate` varchar(10) NOT NULL,
	`content` text NOT NULL,
	`tierSummary` text NOT NULL,
	`topActions` text NOT NULL,
	`memberAssignments` text NOT NULL,
	`escalations` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_briefings_id` PRIMARY KEY(`id`)
);
