CREATE TABLE `adminRoleChanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`actorName` varchar(160) NOT NULL,
	`targetName` varchar(160) NOT NULL,
	`previousRole` varchar(40) NOT NULL,
	`newRole` varchar(40) NOT NULL,
	`previousDepartment` varchar(120),
	`newDepartment` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminRoleChanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `adminRoleChanges_target_createdAt_idx` ON `adminRoleChanges` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `adminRoleChanges_actor_createdAt_idx` ON `adminRoleChanges` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `adminRoleChanges_createdAt_idx` ON `adminRoleChanges` (`createdAt`);