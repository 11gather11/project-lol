import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { userZodSchema } from '../db/schema'

const RiotAuthSchema = userZodSchema.pick({
	discordId: true,
})

export const authRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use('*', cors({ origin: '*' }))
	.post('/riot', zValidator('json', RiotAuthSchema), async (c) => {
		const auth = c.req.header('Authorization')
		if (!auth || !auth.startsWith('Bearer ')) {
			return c.json({ error: 'No or invalid API Key header' }, 401)
		}

		// Get environment variables
		const API_KEY = c.env.API_KEY

		// Validate API Key
		const token = auth.split(' ')[1]
		if (token !== API_KEY) {
			return c.json({ error: 'Invalid API Key' }, 403)
		}

		const { discordId } = c.req.valid('json')

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
	})
