import {
	type APIApplicationCommand,
	type Client,
	REST,
	Routes,
} from 'discord.js'
import { commands } from '@/commands'
import { logger } from '@/logger'
import { env } from '@/schema/env'
import type { SlashCommandBuilderType } from '@/types/client'

export const deployCommands = async (client: Client) => {
	try {
		// 静的インポートしたコマンドを処理
		const slashCommands = loadCommands(client)

		await registerCommands(slashCommands)

		logger.success(`${commands.length} 個のコマンドを正常に読み込みました`)
	} catch (error) {
		logger.error('コマンドの読み込みに失敗しました:', error)
		throw error
	}
}

const loadCommands = (client: Client): SlashCommandBuilderType[] => {
	const slashCommands: SlashCommandBuilderType[] = []
	for (const command of commands) {
		if (!command.command) {
			logger.warn(
				`コマンド ${command.constructor.name} に SlashCommand の要素が見つかりません`
			)
			continue
		}

		// コマンドをクライアントに登録
		slashCommands.push(command.command)
		client.commands.set(command.command.name, command)

		logger.info(`コマンド "${command.command.name}" を読み込みました`)
	}

	return slashCommands
}

const registerCommands = async (slashCommands: SlashCommandBuilderType[]) => {
	const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN)

	try {
		const environment = process.env.NODE_ENV === 'development' ? '開発' : '本番'
		const route =
			environment === '開発'
				? Routes.applicationGuildCommands(
						env.DISCORD_CLIENT_ID,
						env.DISCORD_GUILD_ID
					)
				: Routes.applicationCommands(env.DISCORD_CLIENT_ID)

		const data = (await rest.put(route, {
			body: slashCommands.map((command) => command.toJSON()),
		})) as APIApplicationCommand[]

		logger.success(
			`${environment}環境用 ${data.length} 個のコマンドを登録しました`
		)
	} catch (error) {
		logger.error('Discord APIへのコマンド登録に失敗しました:', error)
		throw error
	}
}
