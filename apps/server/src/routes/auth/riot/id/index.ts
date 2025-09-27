import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

const idSchema = z.object({
	discordId: z.string(),
	riotName: z.string(),
	riotTag: z.string(),
	region: z.string(),
})

export const idRouter = new Hono().post(
	'/',
	zValidator('json', idSchema),
	async (c) => {
		const { discordId, riotName, riotTag, region } = c.req.valid('json')
		console.log(discordId, riotName, riotTag, region)
		if (!discordId || !riotName || !riotTag || !region) {
			return c.json({ error: 'Missing required fields' }, 400)
		}
		console.log(discordId, riotName, riotTag, region)

		return c.json({ message: 'Not implemented yet' })
	}
)
