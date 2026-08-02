CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_global_key` ON `categories` (`name`) WHERE "categories"."owner_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_owner_key` ON `categories` (`owner_id`,`name`) WHERE "categories"."owner_id" is not null;--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`billing_interval` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`next_billing_date` text,
	`notes` text,
	`regular_amount` real,
	`intro_until` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "subscriptions_amount_check" CHECK("subscriptions"."amount" >= 0),
	CONSTRAINT "subscriptions_regular_amount_check" CHECK("subscriptions"."regular_amount" is null or "subscriptions"."regular_amount" >= 0),
	CONSTRAINT "subscriptions_billing_interval_check" CHECK("subscriptions"."billing_interval" in ('weekly', 'monthly', 'quarterly', 'yearly')),
	CONSTRAINT "subscriptions_status_check" CHECK("subscriptions"."status" in ('active', 'paused', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `subscriptions_owner_id_idx` ON `subscriptions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_owner_status_idx` ON `subscriptions` (`owner_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`display_name` text,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" in ('admin', 'member'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_key` ON `users` (`email`);