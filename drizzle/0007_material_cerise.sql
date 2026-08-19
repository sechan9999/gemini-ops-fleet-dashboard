CREATE TABLE `ipcTasks` (
	`id` varchar(100) NOT NULL,
	`label` varchar(180) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`tone` enum('urgent','watch','stable') NOT NULL DEFAULT 'stable',
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','completed') NOT NULL DEFAULT 'open',
	`kind` enum('precaution','cleaning','training') NOT NULL,
	`reason` enum('coverage_gap','ppe_readiness','environmental_cleaning','training_gap') NOT NULL,
	`updatedBy` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ipcTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ipcTasks_status_idx` ON `ipcTasks` (`status`);--> statement-breakpoint
CREATE INDEX `ipcTasks_priority_idx` ON `ipcTasks` (`priority`);--> statement-breakpoint
CREATE INDEX `ipcTasks_reason_idx` ON `ipcTasks` (`reason`);