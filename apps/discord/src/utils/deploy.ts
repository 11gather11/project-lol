import { type Client, REST, Routes } from 'discord.js'
import { logger } from '@/logger'
import { env } from '@/schema/env'

export const deployCommands = async (client: Client): Promise<void> => {
	const commands = client.commands.map((command) => command.command)
	if (commands.length === 0) {
		logger.warn('No commands to deploy.')
		return
	}

	try {
		const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN)
		const isEnv = import.meta.env.NODE_ENV === 'production'
		const route = isEnv
			? Routes.applicationCommands(env.DISCORD_CLIENT_ID)
			: Routes.applicationGuildCommands(
					env.DISCORD_CLIENT_ID,
					env.DISCORD_GUILD_ID
				)
		await rest.put(route, { body: commands })
		logger.success(
			`Successfully deployed ${commands.length} command(s) to ${
				isEnv ? 'global' : 'guild'
			} scope.`
		)
	} catch (error) {
		logger.error('Error deploying commands:', error)
	}
}
