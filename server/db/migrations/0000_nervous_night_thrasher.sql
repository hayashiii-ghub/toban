CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`edit_token` text NOT NULL,
	`name` text NOT NULL,
	`rotation` integer DEFAULT 0 NOT NULL,
	`groups_json` text NOT NULL,
	`members_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedules_slug_unique` ON `schedules` (`slug`);