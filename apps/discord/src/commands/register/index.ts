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
		.setDescription('ランクとDiscordアカウントを紐付けます')
		.addStringOption((option) =>
			option
				.setName('tier')
				.setDescription('ランクを登録します (例: ゴールド、シルバー、ブロンズ)')
				.addChoices(
					{ name: 'アイアン', value: 'IRON' },
					{ name: 'ブロンズ', value: 'BRONZE' },
					{ name: 'シルバー', value: 'SILVER' },
					{ name: 'ゴールド', value: 'GOLD' },
					{ name: 'プラチナ', value: 'PLATINUM' },
					{ name: 'ダイヤモンド', value: 'DIAMOND' },
					{ name: 'マスター', value: 'MASTER' },
					{ name: 'グランドマスター', value: 'GRANDMASTER' },
					{ name: 'チャレンジャー', value: 'CHALLENGER' }
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('division')
				.setDescription('ランクのディビジョンを登録します (例: I、II、III、IV)')
				.addChoices(
					{ name: 'I', value: 'I' },
					{ name: 'II', value: 'II' },
					{ name: 'III', value: 'III' },
					{ name: 'IV', value: 'IV' }
				)
				.setRequired(true)
		)
		.toJSON(),

	execute: async (interaction) => {
		const tier = interaction.options.getString('tier', true)
		const division = interaction.options.getString('division', true)
		const res = await apiClient.rank[':discordId'].$post({
			param: { discordId: interaction.user.id },
			query: { tier, division },
		})

		if (!res.ok) {
			logger.error('APIリクエスト失敗:', res.status, res.statusText)
			await interaction.reply({
				content: '登録中にエラーが発生しました。後でもう一度お試しください。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}

		const data = await res.json()
		await interaction.reply({
			content: data.message,
			flags: MessageFlags.Ephemeral,
		})
	},
} satisfies Command
