CREATE TABLE `installment_items` (
	`id` varchar(36) NOT NULL,
	`planId` varchar(36) NOT NULL,
	`installmentNumber` int NOT NULL,
	`dueDate` varchar(10) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paidDate` varchar(10),
	`isPaid` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `installment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installment_plans` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`installmentCount` int NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`notes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `installment_plans_id` PRIMARY KEY(`id`)
);
