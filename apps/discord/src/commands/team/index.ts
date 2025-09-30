import {
	EmbedBuilder,
	GuildMember,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js'
import { colors, emoji } from '@/config'
import { logger } from '@/lib/logger'
import type { Command } from '@/types/command'
import { apiClient } from '@/utils/apiClient'

// 型定義
interface RankInfo {
	discordId: string
	tier: string
	division: string
}

interface TeamMember {
	member: GuildMember
	rank: number
	tier: string
	division: string
}

interface Team {
	members: TeamMember[]
	totalRankPoints: number
}

interface TeamCombination {
	blueTeam: Team
	redTeam: Team
	powerDifference: number
	combinationId: number
}

// ディビジョンボーナスポイント
const DIVISION_BONUS_POINTS = 2.5

// 戦力差のしきい値（この値以下の組み合わせのみを候補とする）
const MAX_POWER_DIFFERENCE = 50

const ERROR_MESSAGES = {
	SERVER_ONLY: 'このコマンドはサーバー内でのみ使用できます。',
	VOICE_CHANNEL_REQUIRED:
		'このコマンドを使用するには、ボイスチャンネルに参加している必要があります。',
	API_ERROR: '登録中にエラーが発生しました。後でもう一度お試しください。',
	INSUFFICIENT_MEMBERS: 'チーム分けには最低2人必要です。',
	RANK_DATA_FETCH_FAILED: 'ランクデータの取得に失敗しました。',
	NO_COMBINATIONS: 'チーム組み合わせを生成できませんでした。',
	COMBINATION_SELECTION_ERROR: 'チーム組み合わせの選択でエラーが発生しました。',
} as const

// ユーティリティ関数
const calculateRankValue = (tier: string, division: string): number => {
	// 各ティアのベース値（実際のスキル差を反映）
	const tierValues: Record<string, number> = {
		UNRANKED: 0,
		IRON: 10,
		BRONZE: 25,
		SILVER: 40,
		GOLD: 55,
		PLATINUM: 70,
		EMERALD: 85, // プラチナとダイヤモンドの間
		DIAMOND: 100,
		MASTER: 115, // ディビジョンなし
		GRANDMASTER: 130, // ディビジョンなし
		CHALLENGER: 150, // ディビジョンなし
	}

	const baseValue = tierValues[tier] || 0

	// ディビジョンボーナスを追加（高いディビジョンほど高い値）
	if (division && ['IV', 'III', 'II', 'I'].includes(division)) {
		const divisionBonus = ['IV', 'III', 'II', 'I'].indexOf(division)
		return baseValue + divisionBonus * DIVISION_BONUS_POINTS
	}

	return baseValue
}

const getRankEmoji = (tier: string): string => {
	return emoji[tier as keyof typeof emoji] || ''
}

function validateUserAccess(member: unknown): {
	isValid: boolean
	member?: GuildMember
	error?: string
} {
	if (!(member instanceof GuildMember)) {
		return { isValid: false, error: ERROR_MESSAGES.SERVER_ONLY }
	}

	const voiceChannel = member.voice.channel
	if (!voiceChannel) {
		return { isValid: false, error: ERROR_MESSAGES.VOICE_CHANNEL_REQUIRED }
	}

	return { isValid: true, member }
}

const fetchRankData = async (
	discordIds: string[]
): Promise<{ success: boolean; ranks?: RankInfo[]; error?: string }> => {
	try {
		if (!apiClient.rank?.$get) {
			throw new Error('API client rank endpoint not available')
		}

		const response = await apiClient.rank.$get({
			query: { discordIds },
		})

		if (!response.ok) {
			logger.error('APIリクエスト失敗:', response.status, response.statusText)
			return { success: false, error: ERROR_MESSAGES.API_ERROR }
		}

		const data = (await response.json()) as { ranks: RankInfo[] }
		return { success: true, ranks: data.ranks }
	} catch (error) {
		logger.error('API呼び出しエラー:', error)
		return { success: false, error: ERROR_MESSAGES.API_ERROR }
	}
}

// 決定論的シード付きランダム関数
const seededRandom = (seed: number): number => {
	const x = Math.sin(seed) * 10000
	return x - Math.floor(x)
}

// メンバーデータと現在時刻から非決定論的なシードを生成
const generateSeed = (members: GuildMember[], rankData: RankInfo[]): number => {
	const memberIds = members
		.map((member) => member.id)
		.sort()
		.join('')
	const rankString = rankData
		.map(
			(rankInfo) =>
				`${rankInfo.discordId}:${rankInfo.tier}:${rankInfo.division}`
		)
		.sort()
		.join('')

	// 現在時刻を追加して毎回異なる結果を生成
	const timestamp = Date.now().toString()

	let hash = 0
	const combinedString = memberIds + rankString + timestamp
	for (let i = 0; i < combinedString.length; i++) {
		const char = combinedString.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // 32bit整数に変換
	}
	return Math.abs(hash)
}

function generateAllTeamCombinations(
	members: GuildMember[],
	rankData: RankInfo[]
): TeamCombination[] {
	// メンバーにランク情報を付与
	const membersWithRank: TeamMember[] = members.map((member) => {
		const rankInfo = rankData.find((r) => r.discordId === member.id)
		const tier = rankInfo?.tier || 'UNRANKED'
		const division = rankInfo?.division || ''
		return {
			member,
			rank: calculateRankValue(tier, division),
			tier,
			division,
		}
	})

	const totalMembers = membersWithRank.length
	const teamSize = Math.floor(totalMembers / 2)
	const possibleCombinations: TeamCombination[] = []

	// 指定サイズのメンバー組み合わせを生成（ブルーチーム用）
	function generateMemberCombinations(
		availableMembers: TeamMember[],
		requiredSize: number
	): TeamMember[][] {
		if (requiredSize === 0) return [[]]
		if (availableMembers.length === 0) return []

		const firstMember = availableMembers[0]
		if (!firstMember) return []

		const remainingMembers = availableMembers.slice(1)
		const combinationsWithFirst = generateMemberCombinations(
			remainingMembers,
			requiredSize - 1
		).map((combination) => [firstMember, ...combination])
		const combinationsWithoutFirst = generateMemberCombinations(
			remainingMembers,
			requiredSize
		)

		return [...combinationsWithFirst, ...combinationsWithoutFirst]
	}

	const blueTeamCombinations = generateMemberCombinations(
		membersWithRank,
		teamSize
	)

	blueTeamCombinations.forEach((blueTeamMembers, index) => {
		// レッドチームは残りのメンバーで構成
		const redTeamMembers = membersWithRank.filter(
			(member) =>
				!blueTeamMembers.some(
					(blueMember) => blueMember.member.id === member.member.id
				)
		)

		const blueTeam: Team = {
			members: blueTeamMembers,
			totalRankPoints: blueTeamMembers.reduce(
				(sum, member) => sum + member.rank,
				0
			),
		}

		const redTeam: Team = {
			members: redTeamMembers,
			totalRankPoints: redTeamMembers.reduce(
				(sum, member) => sum + member.rank,
				0
			),
		}

		const powerDifference = Math.abs(
			blueTeam.totalRankPoints - redTeam.totalRankPoints
		)

		// しきい値以下の戦力差の組み合わせのみを追加
		if (powerDifference <= MAX_POWER_DIFFERENCE) {
			possibleCombinations.push({
				blueTeam,
				redTeam,
				powerDifference,
				combinationId: index + 1,
			})
		}
	})

	// 戦力差の小さい順にソート（最もバランスの良いものが最初）
	possibleCombinations.sort((a, b) => a.powerDifference - b.powerDifference)

	// ソート後に組み合わせIDを再割り当て
	possibleCombinations.forEach((combination, index) => {
		combination.combinationId = index + 1
	})

	return possibleCombinations
}

function createTeamEmbeds(
	blueTeam: Team,
	redTeam: Team,
	combinationInfo?: { current: number; total: number }
): EmbedBuilder[] {
	// ブルーチームのEmbed作成
	const blueTeamEmbed = new EmbedBuilder()
		.setTitle('Blue Team')
		.addFields(
			blueTeam.members.map((member) => ({
				name: '',
				value: `${getRankEmoji(member.tier)}${member.division} <@${member.member.id}>`,
				inline: true,
			}))
		)
		.setColor(colors.blue)

	// レッドチームのEmbed作成
	const redTeamEmbed = new EmbedBuilder()
		.setTitle('Red Team')
		.addFields(
			redTeam.members.map((member) => ({
				name: '',
				value: `${getRankEmoji(member.tier)}${member.division} <@${member.member.id}>`,
				inline: true,
			}))
		)
		.setColor(colors.red)

	// チーム間の戦力差を計算
	const powerDifference = Math.abs(
		blueTeam.totalRankPoints - redTeam.totalRankPoints
	)

	// チーム情報のEmbed作成
	const teamInfoEmbed = new EmbedBuilder().setTitle('Team Info').addFields(
		{ name: 'Blue Team', value: `${blueTeam.members.length}人`, inline: true },
		{ name: 'Red Team', value: `${redTeam.members.length}人`, inline: true },
		{
			name: '組み合わせ候補',
			value: `${combinationInfo?.current}/${combinationInfo?.total}`,
			inline: true,
		},
		{
			name: 'チーム戦力差',
			value: `${powerDifference}ポイント`,
			inline: true,
		}
	)

	return [blueTeamEmbed, redTeamEmbed, teamInfoEmbed]
}

export default {
	command: new SlashCommandBuilder()
		.setName('team')
		.setDescription('ランクによる実力差を考慮したチーム分けを行います'),

	execute: async (interaction) => {
		await interaction.deferReply()

		// ユーザーアクセスとボイスチャンネルの検証
		const validation = validateUserAccess(interaction.member)
		if (!validation.isValid) {
			await interaction.reply({
				content: validation.error,
				flags: MessageFlags.Ephemeral,
			})
			return
		}

		const { member } = validation
		if (!member?.voice?.channel) {
			await interaction.editReply({
				content: ERROR_MESSAGES.VOICE_CHANNEL_REQUIRED,
			})
			return
		}
		const voiceChannel = member.voice.channel

		// ボイスチャンネルメンバーを取得（ボット除外）
		const channelMembers = Array.from(
			voiceChannel.members.filter((member) => !member.user.bot).values()
		)

		// ランクデータを取得
		const rankDataResult = await fetchRankData(
			channelMembers.map((member) => member.id)
		)
		if (!rankDataResult.success) {
			await interaction.editReply({
				content: rankDataResult.error,
			})
			return
		}

		// 全ての可能なチーム組み合わせを生成
		if (!rankDataResult.ranks) {
			await interaction.editReply({
				content: ERROR_MESSAGES.RANK_DATA_FETCH_FAILED,
			})
			return
		}

		const teamCombinations = generateAllTeamCombinations(
			channelMembers,
			rankDataResult.ranks
		)

		if (teamCombinations.length === 0) {
			await interaction.editReply({
				content: ERROR_MESSAGES.NO_COMBINATIONS,
			})
			return
		}

		// メンバーデータに基づく決定論的ランダム選択
		const randomSeed = generateSeed(channelMembers, rankDataResult.ranks)
		const selectedIndex = Math.floor(
			seededRandom(randomSeed) * teamCombinations.length
		)
		const chosenCombination = teamCombinations[selectedIndex]

		if (!chosenCombination) {
			await interaction.editReply({
				content: ERROR_MESSAGES.COMBINATION_SELECTION_ERROR,
			})
			return
		}

		// 組み合わせ情報付きEmbed作成
		const responseEmbeds = createTeamEmbeds(
			chosenCombination.blueTeam,
			chosenCombination.redTeam,
			{
				current: chosenCombination.combinationId,
				total: teamCombinations.length,
			}
		)

		await interaction.editReply({ embeds: responseEmbeds })
	},
} satisfies Command
