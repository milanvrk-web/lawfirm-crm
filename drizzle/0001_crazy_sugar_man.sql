CREATE TABLE `day_closes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`closedAt` varchar(30) NOT NULL,
	`totalNew` decimal(10,2) NOT NULL,
	`totalExisting` decimal(10,2) NOT NULL,
	`totalRevenue` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `day_closes_id` PRIMARY KEY(`id`),
	CONSTRAINT `day_closes_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_comments` (
	`id` varchar(36) NOT NULL,
	`followUpId` varchar(36) NOT NULL,
	`initial` varchar(10) NOT NULL DEFAULT '',
	`text` text NOT NULL,
	`timestamp` varchar(30) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`dueDate` varchar(10) NOT NULL,
	`status` enum('Pending','Done','Snoozed') NOT NULL DEFAULT 'Pending',
	`title` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`text` text NOT NULL,
	`timestamp` varchar(30) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`caseType` varchar(50) NOT NULL,
	`caseNumber` varchar(100) NOT NULL DEFAULT '',
	`source` varchar(100) NOT NULL DEFAULT '',
	`stage` enum('New Lead','Consultation','Retained','Lost') NOT NULL DEFAULT 'New Lead',
	`notes` text NOT NULL DEFAULT (''),
	`date` varchar(10) NOT NULL,
	`retainerBooked` decimal(10,2) NOT NULL DEFAULT '0',
	`downpayment` decimal(10,2) NOT NULL DEFAULT '0',
	`quotedAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`referredBy` varchar(255) NOT NULL DEFAULT '',
	`convertedDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`date` varchar(10) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`leadId` varchar(36),
	`caseType` varchar(50) NOT NULL,
	`caseNumber` varchar(100) NOT NULL DEFAULT '',
	`paymentType` enum('New Client','Existing Client') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`receivedFor` varchar(500) NOT NULL DEFAULT '',
	`notes` text NOT NULL DEFAULT (''),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
