import { Client, GatewayIntentBits } from 'discord.js'
import { loadCommands } from '@/loaders/commands'
import { loadEvents } from '@/loaders/events.ts'

// 新しいClientインスタンスを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

// コマンドを格納するコレクション
client.commands = await loadCommands()

await loadEvents(client)

client.login(Bun.env.DISCORD_TOKEN)
