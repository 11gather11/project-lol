import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { users, userZodSchema } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { idRouter } from '@/routes/auth/riot/id'

const RiotDiscordIdSchema = userZodSchema.pick({
	discordId: true,
})

const RiotCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
})

export const riotRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.post(
		'/:discordId',
		apiKeyMiddleware,
		zValidator('param', RiotDiscordIdSchema),
		async (c) => {
			const { discordId } = c.req.valid('param')

			const state = crypto.randomUUID()

			await c.env.PROJECT_LOL.put(state, discordId, {
				expirationTtl: 15 * 60,
			})

			const clientId = c.env.RIOT_CLIENT_ID
			const redirectUri = c.env.RIOT_REDIRECT_URI
			const scope = 'openid'

			const authUrl = new URL('https://auth.riotgames.com/authorize')
			authUrl.searchParams.set('client_id', clientId)
			authUrl.searchParams.set('redirect_uri', redirectUri)
			authUrl.searchParams.set('response_type', 'code')
			authUrl.searchParams.set('scope', scope)
			authUrl.searchParams.set('state', state)

			return c.json({
				authUrl: authUrl.toString(),
				state: state,
			})
		}
	)
	.delete(
		'/:discordId',
		apiKeyMiddleware,
		zValidator('param', RiotDiscordIdSchema),
		async (c) => {
			const { discordId } = c.req.valid('param')
			const db = drizzle(c.env.DB)

			const result = await db
				.delete(users)
				.where(eq(users.discordId, discordId))
				.returning()
				.get()
			if (!result) {
				return c.json({ message: 'User not found' }, 404)
			}

			return c.json({
				message: 'User and associated Riot account deleted successfully',
			})
		}
	)
	.get('/callback', zValidator('query', RiotCallbackSchema), async (c) => {
		const { code, state } = c.req.valid('query')
		const db = drizzle(c.env.DB)

		const discordId = await c.env.PROJECT_LOL.get(state)
		if (!discordId) {
			return c.json({ error: 'Invalid or expired state' }, 400)
		}

		// 登録
		const result = await db
			.insert(users)
			.values({ discordId })
			.onConflictDoNothing()
			.returning()
			.get()

		if (!result) {
			return c.json({ message: 'User already registered' }, 409)
		}

		await c.env.PROJECT_LOL.delete(state)

		return c.json({ message: 'Callback received', code, discordId })
	})
	.route('/id', idRouter)
