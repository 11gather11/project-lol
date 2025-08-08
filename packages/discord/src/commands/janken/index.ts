import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	type GuildMember,
	type Interaction,
	type Message,
	type MessageActionRowComponentBuilder,
	SlashCommandBuilder,
} from 'discord.js'
import { config } from '@/config/config'
import type { Command } from '@/types/client'
import { sendErrorReply } from '@/utils/sendErrorReply'

const command: Command = {
	command: new SlashCommandBuilder()
		.setName('じゃんけん')
		.setDescription('じゃんけんゲームを開始します。')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('通常')
				.setDescription('通常のじゃんけんゲームを開始します。')
				.addIntegerOption((option) =>
					option
						.setName('秒数')
						.setDescription(
							'じゃんけんを行う時間を秒単位で指定します。(デフォルト: 10秒)'
						)
						.setMinValue(5)
						.setMaxValue(60)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('チャンネル内')
				.setDescription(
					'同じVCにいるユーザーだけが参加できるじゃんけんを開始します。'
				)
				.addIntegerOption((option) =>
					option
						.setName('秒数')
						.setDescription(
							'じゃんけんを行う時間を秒単位で指定します。(デフォルト: 10秒)'
						)
						.setMinValue(5)
						.setMaxValue(60)
				)
		),

	execute: async (interaction) => {
		const subcommand = interaction.options.getSubcommand() // サブコマンドを取得
		const time = interaction.options.getInteger('秒数') ?? 10 // 秒数を取得、デフォルトは10秒
		const timeInMs = time * 1000 // 秒をミリ秒に変換

		if (subcommand === '通常') {
			// 通常のじゃんけんを開始
			await startJanken(interaction, timeInMs)
		} else if (subcommand === 'チャンネル内') {
			// VC限定のじゃんけんを開始
			const member = interaction.member as GuildMember
			const voiceChannel = member.voice.channel // メンバーのボイスチャンネルを取得

			// ボイスチャンネルが取得できなかった場合
			if (!voiceChannel) {
				// エラーメッセージを返信
				return await sendErrorReply(
					interaction,
					'ボイスチャンネルに参加してからコマンドを実行してください。'
				)
			}

			const membersInVc = voiceChannel.members // ボイスチャンネル内のメンバーを取得

			if (membersInVc.size === 0) {
				return await sendErrorReply(
					interaction,
					'指定されたボイスチャンネルには誰もいません。'
				)
			}

			// VCにいるメンバーのIDを収集
			const allowedUserIds = membersInVc.map((member) => member.id)
			await startJanken(interaction, timeInMs, allowedUserIds) // VC限定のじゃんけんを開始
		}
	},
	cooldown: 10,
}
// じゃんけんの開始処理
const startJanken = async (
	interaction: ChatInputCommandInteraction,
	timeInMs: number,
	allowedUserIds?: string[]
) => {
	// VC参加者の情報を取得し保持する
	const membersInVc = allowedUserIds
		? allowedUserIds.map((id) => `<@${id}>`)
		: undefined
	const actionRow = createJankenButtons() // じゃんけんボタンを作成
	const embed = createInitialEmbed(timeInMs / 1000, membersInVc) // 初期のEmbedメッセージを作成

	const message = await interaction.reply({
		embeds: [embed],
		components: [actionRow],
		fetchReply: true,
	})

	// じゃんけんの選択肢を収集
	const choices = await collectChoices(
		interaction,
		timeInMs,
		message,
		allowedUserIds,
		membersInVc
	)

	// 誰も参加しなかった場合の処理
	if (choices.size === 0) {
		return await endJankenWithNoParticipants(interaction, embed)
	}

	// 結果を計算して表示
	const outcomes = calculateOutcome(Array.from(choices.entries()), interaction)
	await displayResults(interaction, embed, outcomes)
}

// じゃんけんボタンの作成
const createJankenButtons = () => {
	return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('グー')
			.setLabel('✊🏼 グー')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('チョキ')
			.setLabel('✌🏼 チョキ')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId('パー')
			.setLabel('🖐🏼 パー')
			.setStyle(ButtonStyle.Danger)
	)
}

// 初期表示用のEmbedを作成
const createInitialEmbed = (time: number, membersInVc?: string[]) => {
	// VC参加者がいる場合にそのリストを表示
	const description = membersInVc
		? `VC参加者: ${membersInVc.join(', ')}\n選んでください: (残り時間: ${time}秒)`
		: `選んでください: (残り時間: ${time}秒)`

	return new EmbedBuilder()
		.setTitle('🫰🏻 じゃんけん！')
		.setDescription(description)
		.setColor(config.colors.success)
}

// 選択肢を収集
const collectChoices = async (
	interaction: ChatInputCommandInteraction,
	timeInMs: number,
	message: Message,
	allowedUserIds?: string[],
	membersInVc?: string[]
): Promise<Map<string, string>> => {
	const filter = (i: Interaction) => i.isButton()
	const collector = message.createMessageComponentCollector({
		filter,
		time: timeInMs,
	})
	const choices = new Map<string, string>()
	let remainingTime = timeInMs / 1000

	// カウントダウンを表示
	const countdownInterval = setInterval(() => {
		remainingTime -= 1
		const embed = createInitialEmbed(remainingTime, membersInVc) // VC参加者を保持
		interaction.editReply({ embeds: [embed] })
	}, 1000)

	// ボタンがクリックされた時の処理
	collector?.on('collect', async (i) => {
		if (!i.isButton()) {
			return
		}

		// 参加が許可されていないユーザーがボタンを押した場合の処理
		if (allowedUserIds && !allowedUserIds.includes(i.user.id)) {
			return await sendErrorReply(i, 'あなたはじゃんけんに参加できません。')
		}

		// 参加者の選択肢を保存
		choices.set(i.user.id, i.customId)
		await i.deferUpdate()
	})

	// ボタンのクリックが終了した時の処理
	await new Promise<void>((resolve) => collector?.on('end', resolve))

	clearInterval(countdownInterval) // カウントダウンを停止
	return choices
}

// 参加者がいなかった場合の処理
const endJankenWithNoParticipants = async (
	interaction: ChatInputCommandInteraction,
	embed: EmbedBuilder
) => {
	embed.setDescription('誰も参加しませんでした。')
	embed.setFooter({
		text: 'じゃんけんを開始するにはもう一度コマンドを実行してください。',
	})
	await interaction.editReply({ embeds: [embed], components: [] })
}

// 結果を計算
const calculateOutcome = (
	results: [string, string][],
	interaction: ChatInputCommandInteraction
): Outcomes => {
	const formattedResults = results.map(([userId, choice]) => ({
		userId,
		displayName: interaction.guild?.members.cache.get(userId)?.displayName,
		choice,
		emoji: { グー: '✊🏼', チョキ: '✌🏼', パー: '🖐🏼' }[choice] || '❓', // デフォルト値を追加
	}))

	// 結果を集計して、あいこかどうかを判断
	const choiceCounts = countChoices(formattedResults)
	const isDraw = determineIfDraw(choiceCounts)
	const winners = isDraw ? [] : determineWinners(formattedResults, choiceCounts)
	return { results: formattedResults, winners, draw: isDraw }
}

// 結果を表示
const displayResults = async (
	interaction: ChatInputCommandInteraction,
	embed: EmbedBuilder,
	outcomes: Outcomes
) => {
	let resultMessage = outcomes.results
		.map((r) => `${r.displayName}: ${r.emoji}`)
		.join('\n')

	resultMessage += outcomes.draw
		? '\n\n引き分けです!'
		: `\n\n**勝者:** ${outcomes.winners.join(', ')}`

	embed.setDescription(resultMessage)
	await interaction.editReply({
		embeds: [embed],
		components: [],
	})
}

// 各選択肢の数を数える関数
const countChoices = (results: OutcomeResult[]) => {
	return results.reduce(
		(counts, result) => {
			counts[result.choice as keyof typeof counts]++
			return counts
		},
		{ グー: 0, チョキ: 0, パー: 0 }
	)
}

// あいこかどうかを判定する関数
const determineIfDraw = (counts: {
	グー: number
	パー: number
	チョキ: number
}) => {
	const { グー, チョキ, パー } = counts
	return (
		(グー > 0 && パー === 0 && チョキ === 0) ||
		(パー > 0 && グー === 0 && チョキ === 0) ||
		(チョキ > 0 && グー === 0 && パー === 0) ||
		(グー > 0 && パー > 0 && チョキ > 0)
	)
}

// 勝者を決定する関数
const determineWinners = (
	results: OutcomeResult[],
	counts: { グー: number; パー: number; チョキ: number }
) => {
	const { グー, パー, チョキ } = counts
	let winningChoice = ''

	if (グー > 0 && パー > 0 && チョキ === 0) {
		winningChoice = 'パー'
	} else if (グー > 0 && チョキ > 0 && パー === 0) {
		winningChoice = 'グー'
	} else if (パー > 0 && チョキ > 0 && グー === 0) {
		winningChoice = 'チョキ'
	}

	// 勝者の名前をリストアップ
	return results
		.filter((result) => result.choice === winningChoice && result.displayName)
		.map((result) => result.displayName as string)
}

// 型定義
interface OutcomeResult {
	userId: string
	displayName?: string
	choice: string
	emoji: string
}

interface Outcomes {
	results: OutcomeResult[]
	winners: string[]
	draw: boolean
}

export default command
