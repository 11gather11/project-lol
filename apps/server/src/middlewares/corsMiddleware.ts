import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

export const corsMiddleware = createMiddleware<{ Bindings: Cloudflare.Env }>(
	async (c, next) => {
		const corsMiddleware = cors({
			origin: c.env.CORS_ORIGIN,
			allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
			allowMethods: ['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
			credentials: true,
		})
		await corsMiddleware(c, next)
	}
)
