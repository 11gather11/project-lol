import { Client, Collection, GatewayIntentBits } from 'discord.js'
import { loadCommands } from '@/loaders/commands'
import { loadEvents } from '@/loaders/events.ts'
import type { Command } from '@/types/command'
import { deployCommands } from '@/utils/deploy'

// 新しいClientインスタンスを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

// コマンドを格納するコレクション
client.commands = new Collection<string, Command>()

await loadCommands(client)

await loadEvents(client)

await deployCommands(client)

client.login(Bun.env.DISCORD_TOKEN)
