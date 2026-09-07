CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`amount` real NOT NULL,
	`changed_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "price_history_amount_check" CHECK("price_history"."amount" >= 0),
	CONSTRAINT "price_history_source_check" CHECK("price_history"."source" in ('initial', 'auto', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `price_history_subscription_id_idx` ON `price_history` (`subscription_id`,`changed_at`);