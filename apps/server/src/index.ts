import { Hono } from 'hono'
import { authRouter } from '@/routes/auth'
import { rankRouter } from '@/routes/rank'
import version from '../package.json'

const app = new Hono()
	.get('/', (c) => {
		return c.text(`Project LoL Server is running! | v ${version.version}`)
	})
	.route('/auth', authRouter)
	.route('/rank', rankRouter)

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
