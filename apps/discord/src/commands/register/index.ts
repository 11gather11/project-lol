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
		.setName('register')
		.setDescription('LoLのアカウントとDiscordアカウントを紐付けます')
		.toJSON(),

	execute: async (interaction) => {
		const res = await apiClient.auth.riot[':discordId'].$post({
			param: { discordId: interaction.user.id },
		})

		if (!res.ok) {
			logger.error('APIリクエスト失敗:', res.status, res.statusText)
			await interaction.reply({
				content: '登録URLの取得に失敗しました。後でもう一度お試しください。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}

		await interaction.reply({
			content: 'DMで詳細を送信しました。',
			flags: MessageFlags.Ephemeral,
		})
		const data = await res.json()
		await interaction.user.send(
			`以下のURLからRiotアカウントでログインしてください: ${data.authUrl}`
		)
	},
} satisfies Command
