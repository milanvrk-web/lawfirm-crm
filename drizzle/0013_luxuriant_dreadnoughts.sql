CREATE TABLE `ai_lead_analysis` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`tier` varchar(20) NOT NULL,
	`score` int NOT NULL,
	`headline` varchar(500) NOT NULL,
	`nextAction` text NOT NULL,
	`riskFlags` text NOT NULL DEFAULT ('[]'),
	`reasoning` text NOT NULL DEFAULT (''),
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_lead_analysis_id` PRIMARY KEY(`id`)
);
