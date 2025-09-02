import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authRouter } from './routes/auth'

const app = new Hono()
	.get('/', (c) => {
		return c.text('Project LoL Server is running!')
	})
	.route('/auth', authRouter)

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		console.error('Error:', err.message)
	} else {
		console.error('Unknown error:', err)
	}

	// Log the error stack if available
	if (err.stack) {
		console.error('Stack trace:', err.stack)
	}

	// Return a generic error response
	console.error(err)
	return c.json({ error: 'Internal Server Error' }, 500)
})

app.notFound((c) => {
	return c.json({ error: 'Not Found' }, 404)
})

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
