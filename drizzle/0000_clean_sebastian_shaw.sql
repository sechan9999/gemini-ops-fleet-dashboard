CREATE TABLE `approvalRequests` (
	`id` varchar(64) NOT NULL,
	`actionType` varchar(120) NOT NULL,
	`state` enum('pending','approved','rejected','sent') NOT NULL DEFAULT 'pending',
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`agent` varchar(160) NOT NULL,
	`domain` varchar(160) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`payload` json NOT NULL,
	`evidence` json NOT NULL,
	`aiSummary` text,
	`approvedBy` varchar(160),
	`rejectedBy` varchar(160),
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`approvalId` varchar(64),
	`actor` varchar(160) NOT NULL,
	`role` varchar(80) NOT NULL,
	`tool` varchar(120) NOT NULL,
	`outcome` varchar(40) NOT NULL,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operatorProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dashboardRole` enum('data_scientist','medical_director','payer_operations') NOT NULL DEFAULT 'data_scientist',
	`department` varchar(120),
	`initials` varchar(8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operatorProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `operatorProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
