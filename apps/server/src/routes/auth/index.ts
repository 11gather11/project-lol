import { Hono } from 'hono'
import { riotRouter } from '@/routes/auth/riot'

export const authRouter = new Hono().route('/riot', riotRouter)
