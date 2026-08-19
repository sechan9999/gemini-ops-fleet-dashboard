CREATE TABLE `ipcTaskComments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`taskId` varchar(100) NOT NULL,
	`comment` text NOT NULL,
	`actor` varchar(160) NOT NULL,
	`role` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ipcTaskComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ipcTaskComments_task_idx` ON `ipcTaskComments` (`taskId`);--> statement-breakpoint
CREATE INDEX `ipcTaskComments_created_idx` ON `ipcTaskComments` (`createdAt`);