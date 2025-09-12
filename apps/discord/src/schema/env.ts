import { z } from 'zod'

const envSchema = z.object({
	DISCORD_TOKEN: z.string(),
	DISCORD_CLIENT_ID: z.string(),
	DISCORD_GUILD_ID: z.string(),
	DISCORD_LOG_WEBHOOK_URL: z.url(),
})

const parsedEnv = envSchema.safeParse(process.env)
if (!parsedEnv.success) {
	console.error(
		'Invalid environment variables:',
		z.treeifyError(parsedEnv.error)
	)
	throw new Error('Invalid environment variables')
}

export const env = parsedEnv.data

export type Env = z.infer<typeof envSchema>
