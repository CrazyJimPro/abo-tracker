ALTER TABLE `subscriptions` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `users` ADD `abo_payment_filter` text DEFAULT '' NOT NULL;