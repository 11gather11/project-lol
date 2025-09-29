import { zValidator } from '@hono/zod-validator'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { lolRank, lolRankZodSchema, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'

const RankSchema = lolRankZodSchema

const GetRanksQuerySchema = z.object({
	discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
})

export const rankRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.post('/', zValidator('json', RankSchema), async (c) => {
		const { discordId, tier, division } = c.req.valid('json')

		const db = drizzle(c.env.DB)

		await db
			.insert(users)
			.values({
				discordId,
			})
			.onConflictDoNothing()

		await db
			.insert(lolRank)
			.values({ discordId, tier, division })
			.onConflictDoUpdate({
				target: lolRank.discordId,
				set: { tier, division },
			})

		return c.json({ message: 'ランクが正常に登録されました。' })
	})
	.get('/', zValidator('query', GetRanksQuerySchema), async (c) => {
		const { discordIds } = c.req.valid('query')

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
				}
			)
		})

		return c.json({ ranks: result })
	})
