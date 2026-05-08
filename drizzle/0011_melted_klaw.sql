CREATE TABLE `pipeline_stages` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(60) NOT NULL DEFAULT 'oklch(0.55 0.18 250)',
	`order` int NOT NULL DEFAULT 0,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_checklist_completions` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`templateItemId` varchar(36) NOT NULL,
	`completedAt` varchar(30),
	`completedBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stage_checklist_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_checklist_templates` (
	`id` varchar(36) NOT NULL,
	`stageId` varchar(36) NOT NULL,
	`label` varchar(200) NOT NULL,
	`description` text,
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stage_checklist_templates_id` PRIMARY KEY(`id`)
);
