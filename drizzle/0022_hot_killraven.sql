ALTER TABLE `leads` ADD `consultationBookedDate` varchar(10);--> statement-breakpoint
ALTER TABLE `leads` ADD `consultationScheduledFor` varchar(10);--> statement-breakpoint
ALTER TABLE `leads` ADD `consultationFeeAppliedToRetainer` int DEFAULT 0 NOT NULL;