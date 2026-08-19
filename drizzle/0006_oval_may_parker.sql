CREATE TABLE `ipcPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` varchar(80) NOT NULL,
	`facilityName` varchar(180) NOT NULL,
	`handHygieneWatchPct` int NOT NULL DEFAULT 80,
	`handHygieneCriticalPct` int NOT NULL DEFAULT 60,
	`evidenceStaleMinutes` int NOT NULL DEFAULT 60,
	`ppeStaleHours` int NOT NULL DEFAULT 24,
	`urgentNotifications` boolean NOT NULL DEFAULT true,
	`watchNotifications` boolean NOT NULL DEFAULT true,
	`lowResourceDefault` boolean NOT NULL DEFAULT false,
	`updatedBy` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ipcPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `ipcPolicies_facilityId_unique` UNIQUE(`facilityId`)
);
--> statement-breakpoint
CREATE INDEX `ipcPolicies_facilityName_idx` ON `ipcPolicies` (`facilityName`);