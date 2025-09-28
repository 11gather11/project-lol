import { zValidator } from '@hono/zod-validator'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { lolRank, lolRankZodSchema, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'

const RiotDiscordIdSchema = lolRankZodSchema.pick({
	discordId: true,
	tier: true,
	division: true,
})

const GetRanksQuerySchema = z.object({
	discordIds: z.string().transform((val) => val.split(',')),
})

export const rankRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.post(
		'/:discordId',
		apiKeyMiddleware,
		zValidator('param', RiotDiscordIdSchema.pick({ discordId: true })),
		zValidator(
			'query',
			RiotDiscordIdSchema.pick({ tier: true, division: true })
		),
		async (c) => {
			const { discordId } = c.req.valid('param')
			const { tier, division } = c.req.valid('query')

			const db = drizzle(c.env.DB)

			await db
				.insert(users)
				.values({
					discordId,
				})
				.onConflictDoNothing()

			await db
				.insert(lolRank)
				.values({
					discordId,
					tier,
					division,
				})
				.onConflictDoUpdate({
					target: lolRank.discordId,
					set: { tier, division },
				})
				.returning()

			return c.json({ message: `登録完了しました: ${tier} ${division}` })
		}
	)
	.get(
		'/:discordIds',
		apiKeyMiddleware,
		zValidator('param', GetRanksQuerySchema),
		async (c) => {
			const { discordIds } = c.req.valid('param')

			const db = drizzle(c.env.DB)

			const ranks = await db
				.select()
				.from(lolRank)
				.where(inArray(lolRank.discordId, discordIds))

			const ranksMap = new Map(ranks.map((rank) => [rank.discordId, rank]))

			const result = discordIds.map((discordId) => {
				const rank = ranksMap.get(discordId)
				return (
					rank || {
						discordId,
						tier: 'UNRANKED',
						division: '',
						id: null,
					}
				)
			})

			return c.json({ ranks: result })
		}
	)
