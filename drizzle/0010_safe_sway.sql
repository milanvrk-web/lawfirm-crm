CREATE TABLE `onboarding_checklist` (
	`id` varchar(36) NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`step` enum('consultation_booked','case_notes_created','task_added_cerenade','task_added_planner') NOT NULL,
	`completedAt` varchar(30),
	`completedBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `stage` enum('New Lead','Consultation','Follow-Up','Retained','Onboarding','Lost') NOT NULL DEFAULT 'New Lead';