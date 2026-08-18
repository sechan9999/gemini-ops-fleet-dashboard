CREATE TABLE `operationalMetricSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`activeConnections` int NOT NULL DEFAULT 0,
	`deliveryLatencyMs` int NOT NULL DEFAULT 0,
	`maxDeliveryLatencyMs` int NOT NULL DEFAULT 0,
	`deliveredNotifications` int NOT NULL DEFAULT 0,
	`totalNotifications` int NOT NULL DEFAULT 0,
	`droppedClients` int NOT NULL DEFAULT 0,
	`bridgeReceived` int NOT NULL DEFAULT 0,
	`bridgePublished` int NOT NULL DEFAULT 0,
	`bridgeFailed` int NOT NULL DEFAULT 0,
	CONSTRAINT `operationalMetricSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operationalMetricSnapshots_capturedAt_idx` ON `operationalMetricSnapshots` (`capturedAt`);