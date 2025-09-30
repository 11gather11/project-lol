import type { AppType } from '@project-lol/server'
import { hc } from 'hono/client'

export const apiClient = hc<AppType>(Bun.env.API_BASE_URL, {
	headers: { 'x-api-key': Bun.env.API_KEY },
})
