import { z } from 'zod'

const envSchema = z.object({
	DISCORD_TOKEN: z.string(),
	DISCORD_CLIENT_ID: z.string(),
	DISCORD_GUILD_ID: z.string(),
	DISCORD_LOG_WEBHOOK_URL: z.url(),
	API_BASE_URL: z.url(),
	API_KEY: z.string(),
})

envSchema.parse(process.env)

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envSchema> {}
	}
}
