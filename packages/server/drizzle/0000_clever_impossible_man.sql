CREATE TABLE `riot_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`puuid` text NOT NULL,
	`gameName` text NOT NULL,
	`tagLine` text NOT NULL,
	`region` text NOT NULL,
	`soloRank` text,
	`soloTier` text,
	`soloLP` integer,
	`flexRank` text,
	`flexTier` text,
	`flexLP` integer,
	`lastUpdated` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `riot_accounts_userId_unique` ON `riot_accounts` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `riot_accounts_puuid_unique` ON `riot_accounts` (`puuid`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`username` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
