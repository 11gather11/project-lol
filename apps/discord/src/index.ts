import { Client, Collection, GatewayIntentBits } from 'discord.js'
import { loadCommands } from '@/loaders/commands'
import { loadEvents } from '@/loaders/events.ts'
import type { Command } from '@/types/command'
import { deployCommands } from '@/utils/deploy'
import { env } from './schema/env.ts'

// 新しいClientインスタンスを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds],
})

// コマンドを格納するコレクション
client.commands = new Collection<string, Command>()

await loadCommands(client)

await loadEvents(client)

await deployCommands(client)

client.login(env.DISCORD_TOKEN)
