import type { AppType } from '@project-lol/server'
import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import { hc } from 'hono/client'
import { logger } from '@/logger'
import { env } from '@/schema/env'
import type { Command } from '@/types/command'

const apiClient = hc<AppType>(env.API_BASE_URL, {
	headers: { 'x-api-key': env.API_KEY },
})

export default {
	command: new SlashCommandBuilder()
		.setName('register_id')
		.setDescription(
			'idとregionを指定してLoLのアカウントとDiscordアカウントを紐付けます(今後は非推奨)'
		)
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('Riotのサモナーネーム')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('tag')
				.setDescription('Riotのタグライン(例: jp1)')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('region')
				.setDescription('Riotのリージョン (例: asia, euw, na)')
				.setRequired(true)
		)
		.toJSON(),

	execute: async (interaction) => {
		const name = interaction.options.getString('name', true)
		const tag = interaction.options.getString('tag', true)
		const region = interaction.options.getString('region', true)

		const res = await apiClient.auth.riot.id.$post({
			json: {
				discordId: interaction.user.id,
				riotName: name,
				riotTag: tag,
				region: region,
			},
		})

		if (!res.ok) {
			logger.error('APIリクエスト失敗:', res.status, res.statusText)
			await interaction.reply({
				content: '登録URLの取得に失敗しました。後でもう一度お試しください。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}
		const data = await res.json()
		await interaction.reply({
			content: ` ${data.message}`,
			flags: MessageFlags.Ephemeral,
		})
	},
} satisfies Command
