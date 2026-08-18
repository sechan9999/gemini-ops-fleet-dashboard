CREATE TABLE `fleetAgents` (
	`id` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`domain` varchar(160) NOT NULL,
	`version` varchar(40) NOT NULL,
	`autonomy` varchar(40) NOT NULL,
	`capabilities` json NOT NULL,
	`restrictions` json NOT NULL,
	`health` varchar(40) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fleetAgents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fleetEvents` (
	`id` varchar(80) NOT NULL,
	`kind` varchar(120) NOT NULL,
	`actor` varchar(160) NOT NULL,
	`routedTo` varchar(160) NOT NULL,
	`status` varchar(40) NOT NULL,
	`detail` text NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fleetEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `runtimeTelemetry` (
	`id` varchar(64) NOT NULL,
	`mode` varchar(40) NOT NULL,
	`model` varchar(120) NOT NULL,
	`database` varchar(120) NOT NULL,
	`guardrail` varchar(120) NOT NULL,
	`pubsub` varchar(120) NOT NULL,
	`trace` varchar(120) NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `runtimeTelemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `fleetAgents_domain_idx` ON `fleetAgents` (`domain`);--> statement-breakpoint
CREATE INDEX `fleetAgents_health_idx` ON `fleetAgents` (`health`);--> statement-breakpoint
CREATE INDEX `fleetEvents_occurredAt_idx` ON `fleetEvents` (`occurredAt`);--> statement-breakpoint
CREATE INDEX `fleetEvents_status_idx` ON `fleetEvents` (`status`);--> statement-breakpoint
CREATE INDEX `runtimeTelemetry_capturedAt_idx` ON `runtimeTelemetry` (`capturedAt`);--> statement-breakpoint
CREATE INDEX `approvalRequests_state_createdAt_idx` ON `approvalRequests` (`state`,`createdAt`);--> statement-breakpoint
CREATE INDEX `approvalRequests_priority_createdAt_idx` ON `approvalRequests` (`priority`,`createdAt`);--> statement-breakpoint
CREATE INDEX `approvalRequests_domain_idx` ON `approvalRequests` (`domain`);