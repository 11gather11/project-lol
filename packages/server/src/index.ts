import { Hono } from 'hono'
import { envRouter } from './routes/env'

const app = new Hono().route('/env', envRouter)

export type EnvRouter = typeof envRouter

export default {
	port: 3001,
	fetch: app.fetch,
}
