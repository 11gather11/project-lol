import { Client, Collection, GatewayIntentBits } from 'discord.js'
import { deployCommands } from '@/loaders/commands'
import { deployEvents } from '@/loaders/events'
import type { Command } from '@/types/client'
import { env } from './schema/env.ts'

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

deployEvents(client)

client.login(env.DISCORD_TOKEN)
