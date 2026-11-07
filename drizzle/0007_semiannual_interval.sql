-- Neuer Wert 'semiannual' (halbjährlich) im CHECK von billing_interval.
-- SQLite kann einen CHECK nicht ändern, die Tabelle muss neu aufgebaut werden.
--
-- Von Hand statt so, wie drizzle-kit es erzeugt: drizzle-kit migrate läuft in
-- einer Transaktion, dort ist PRAGMA foreign_keys=OFF wirkungslos. Das
-- DROP TABLE subscriptions löscht dann per ON DELETE CASCADE den kompletten
-- Preisverlauf (price_history). Deshalb wird price_history vorher gesichert
-- und danach zurückgeschrieben — das klappt mit und ohne Fremdschlüssel.
CREATE TABLE `__price_history_backup` AS SELECT * FROM `price_history`;--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
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
	`contract_end` text,
	`notice_period` integer,
	`notice_unit` text,
	`payment_method` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "subscriptions_amount_check" CHECK("amount" >= 0),
	CONSTRAINT "subscriptions_regular_amount_check" CHECK("regular_amount" is null or "regular_amount" >= 0),
	CONSTRAINT "subscriptions_billing_interval_check" CHECK("billing_interval" in ('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly')),
	CONSTRAINT "subscriptions_status_check" CHECK("status" in ('active', 'paused', 'cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "owner_id", "category_id", "name", "amount", "billing_interval", "status", "next_billing_date", "notes", "regular_amount", "intro_until", "contract_end", "notice_period", "notice_unit", "payment_method", "created_at", "updated_at") SELECT "id", "owner_id", "category_id", "name", "amount", "billing_interval", "status", "next_billing_date", "notes", "regular_amount", "intro_until", "contract_end", "notice_period", "notice_unit", "payment_method", "created_at", "updated_at" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
CREATE INDEX `subscriptions_owner_id_idx` ON `subscriptions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_owner_status_idx` ON `subscriptions` (`owner_id`,`status`);--> statement-breakpoint
DELETE FROM `price_history`;--> statement-breakpoint
INSERT INTO `price_history` SELECT * FROM `__price_history_backup`;--> statement-breakpoint
DROP TABLE `__price_history_backup`;
