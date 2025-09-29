import type { AppType } from '@project-lol/server'
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { hc } from 'hono/client'
import { colors, emoji } from '@/config'
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
				.setDescription('ティアを登録します')
				.addChoices(
					{ name: 'アンランク', value: 'UNRANKED' },
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
				.setDescription('ディビジョンを登録します')
				.addChoices(
					{ name: 'IV', value: 'IV' },
					{ name: 'III', value: 'III' },
					{ name: 'II', value: 'II' },
					{ name: 'I', value: 'I' },
					{ name: 'なし', value: 'NONE' }
				)
				.setRequired(true)
		)
		.toJSON(),

	execute: async (interaction) => {
		try {
			// オプションの取得
			const tier = interaction.options.getString('tier', true)
			// ディビジョンはアンランク,マスター,グランドマスター,チャレンジャーの場合は空文字にする
			const division = [
				'UNRANKED',
				'MASTER',
				'GRANDMASTER',
				'CHALLENGER',
			].includes(tier)
				? ''
				: interaction.options.getString('division', true) === 'NONE'
					? ''
					: interaction.options.getString('division', true)

			// APIリクエスト

			//元のランクを取得
			const resGet = await apiClient.rank.$get({
				query: { discordIds: interaction.user.id },
			})

			if (!resGet.ok) {
				logger.error('APIリクエスト失敗:', resGet.status, resGet.statusText)
				await interaction.reply({
					content: '登録中にエラーが発生しました。後でもう一度お試しください。',
					flags: MessageFlags.Ephemeral,
				})
				return
			}

			const dataGet = (await resGet.json()).ranks[0]
			if (!dataGet) {
				await interaction.reply({
					content:
						'現在のランク情報が取得できません。先にランクを登録してください。',
					flags: MessageFlags.Ephemeral,
				})
				return
			}

			// 新しいランクを登録
			const res = await apiClient.rank.$post({
				json: {
					discordId: interaction.user.id,
					tier,
					division,
				},
			})

			if (!res.ok) {
				logger.error('APIリクエスト失敗:', res.status, res.statusText)
				await interaction.reply({
					content: '登録中にエラーが発生しました。後でもう一度お試しください。',
					flags: MessageFlags.Ephemeral,
				})
				return
			}

			const oldEmoji = emoji[dataGet.tier as keyof typeof emoji] || ''
			const newEmoji = emoji[tier as keyof typeof emoji] || ''

			const embedMessage = new EmbedBuilder()
				.setTitle('ランク登録完了')
				.setColor(colors.success)
				.addFields(
					{
						name: 'Old Rank',
						value: `${oldEmoji} ${dataGet.tier} ${dataGet.division}`,
						inline: true,
					},
					{
						name: 'ㅤ',
						value: '➤',
						inline: true,
					},
					{
						name: 'New Rank',
						value: `${newEmoji} ${tier} ${division}`,
						inline: true,
					}
				)
				.setThumbnail(interaction.user.displayAvatarURL())

			await interaction.reply({
				embeds: [embedMessage],
			})
		} catch (error) {
			logger.error('コマンド実行中にエラーが発生:', error)
			await interaction.reply({
				content: '予期しないエラーが発生しました。後でもう一度お試しください。',
				flags: MessageFlags.Ephemeral,
			})
		}
	},
} satisfies Command
