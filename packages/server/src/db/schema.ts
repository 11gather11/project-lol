import { relations, sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	discordId: text('discord_id').notNull(),
	username: text('username').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(
		sql`(unixepoch())`
	),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
		sql`(unixepoch())`
	),
})

export const riotAccounts = sqliteTable('riot_accounts', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
		.unique(),
	puuid: text('puuid').notNull().unique(),
	gameName: text('gameName').notNull(),
	tagLine: text('tagLine').notNull(),
	region: text('region').notNull(),
	soloRank: text('soloRank'),
	soloTier: text('soloTier'),
	soloLP: integer('soloLP'),
	flexRank: text('flexRank'),
	flexTier: text('flexTier'),
	flexLP: integer('flexLP'),
	lastUpdated: integer('lastUpdated', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
})

export const usersRelations = relations(users, ({ one }) => ({
	riotAccount: one(riotAccounts),
}))

export const riotAccountsRelations = relations(riotAccounts, ({ one }) => ({
	user: one(users, {
		fields: [riotAccounts.userId],
		references: [users.id],
	}),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type RiotAccount = typeof riotAccounts.$inferSelect
export type NewRiotAccount = typeof riotAccounts.$inferInsert
