import type { AppType } from '@project-lol/server'
import { GuildMember, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { hc } from 'hono/client'
import { logger } from '@/logger'
import { env } from '@/schema/env'
import type { Command } from '@/types/command'

const apiClient = hc<AppType>(env.API_BASE_URL, {
	headers: { 'x-api-key': env.API_KEY },
})

export default {
	command: new SlashCommandBuilder()
		.setName('team')
		.setDescription('ランクによる実力差を考慮したチーム分けを行います')
		.toJSON(),

	execute: async (interaction) => {
		// コマンド実行者のボイスチャンネルの人たちを取得
		const member = interaction.member
		if (!(member instanceof GuildMember)) {
			await interaction.reply({
				content: 'このコマンドはサーバー内でのみ使用できます。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}
		const voiceChannel = member.voice.channel
		if (!voiceChannel) {
			await interaction.reply({
				content:
					'このコマンドを使用するには、ボイスチャンネルに参加している必要があります。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}

		const members = Array.from(
			voiceChannel.members.filter((m) => !m.user.bot).values()
		)
		if (members.length < 2) {
			await interaction.reply({
				content: 'ボイスチャンネルに2人以上参加している必要があります。',
				flags: MessageFlags.Ephemeral,
			})
			return
		}

		const res = await apiClient.rank[':discordIds'].$get({
			param: { discordIds: members.map((m) => m.id).join(',') },
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

		// ランクをもとにチーム分け
		const teams = (() => {
			const teamA: GuildMember[] = []
			const teamB: GuildMember[] = []
			let rankA = 0
			let rankB = 0

			const rankValue = (tier: string, division: string) => {
				const tierOrder = [
					'UNRANKED',
					'IRON',
					'BRONZE',
					'SILVER',
					'GOLD',
					'PLATINUM',
					'DIAMOND',
					'MASTER',
					'GRANDMASTER',
					'CHALLENGER',
				]
				const divisionOrder = ['IV', 'III', 'II', 'I']

				const tierIndex = tierOrder.indexOf(tier)
				const divisionIndex = division ? divisionOrder.indexOf(division) : -1
				return tierIndex * 4 + (divisionIndex >= 0 ? 3 - divisionIndex : 0)
			}

			const membersWithRank = members.map((m) => {
				const rankInfo = data.ranks.find((r) => r.discordId === m.id)
				return {
					member: m,
					rank: rankInfo ? rankValue(rankInfo.tier, rankInfo.division) : 0,
				}
			})
			membersWithRank.sort((a, b) => b.rank - a.rank)

			for (const { member, rank } of membersWithRank) {
				if (rankA <= rankB) {
					teamA.push(member)
					rankA += rank
				} else {
					teamB.push(member)
					rankB += rank
				}
			}
			return { teamA, teamB }
		})()

		// 結果を返信
		const formatTeam = (team: GuildMember[]) =>
			team.map((m) => `${m.user.username}#${m.user.discriminator}`).join('\n')
		await interaction.reply({
			content: `チーム分けの結果:\n\n**チーム A:**\n${formatTeam(teams.teamA)}\n\n**チーム B:**\n${formatTeam(teams.teamB)}`,
			flags: MessageFlags.Ephemeral,
		})
	},
} satisfies Command
