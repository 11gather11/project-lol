import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { cors } from 'hono/cors'

export const envRouter = new Hono()
	.use('*', cors({ origin: '*' }))
	.get('/', (c) => {
		const { TEST } = env<{ TEST: string }>(c)
		return c.json({ TEST })
	})
