import { Client, Collection, GatewayIntentBits } from 'discord.js'
import { Hono } from 'hono'
import { deployCommands } from '@/loaders/commands'
import type { Command } from '@/types/client'
import { env } from './schema/env'

const app = new Hono()

// 新しいClientインスタンスを作成
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
})

// コマンドを格納するコレクション
client.commands = new Collection<string, Command>()
client.cooldowns = new Collection<string, number>()

deployCommands(client)

client.login(env.DISCORD_TOKEN)

export default {
	port: 3001,
	fetch: app.fetch,
}
