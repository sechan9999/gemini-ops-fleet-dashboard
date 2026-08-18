CREATE TABLE `operatorNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(40) NOT NULL DEFAULT 'role_change',
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operatorNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operatorNotifications_user_createdAt_idx` ON `operatorNotifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `operatorNotifications_user_readAt_idx` ON `operatorNotifications` (`userId`,`readAt`);