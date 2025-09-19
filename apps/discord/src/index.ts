import { Client, Collection } from 'discord.js'
import { loadCommands } from '@/loaders/commands'
import { loadEvents } from '@/loaders/events.ts'
import type { Command, Cooldown } from '@/types/command'
import { deployCommands } from '@/utils/deploy'
import { env } from './schema/env.ts'

// 新しいClientインスタンスを作成
const client = new Client({
	intents: [],
})

// コマンドを格納するコレクション
client.commands = new Collection<string, Command>()
client.cooldowns = new Collection<string, Cooldown>()

await loadCommands(client)

await loadEvents(client)

await deployCommands(client)

client.login(env.DISCORD_TOKEN)
