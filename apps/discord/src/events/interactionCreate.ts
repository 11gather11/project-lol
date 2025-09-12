import {
	type AutocompleteInteraction,
	type ButtonInteraction,
	type CacheType,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	Events,
	type ModalSubmitInteraction,
} from 'discord.js'
import { colors } from '@/config/colors'
import { logger } from '@/logger'
import type { Event } from '@/types/event'

export default {
	name: Events.InteractionCreate,
	execute(interaction) {
		// 受け取ったインタラクションの種類に応じてハンドラを呼び出す
		if (interaction.isChatInputCommand()) {
			handleChatInputCommand(interaction)
		} else if (interaction.isButton()) {
			handleButton(interaction)
		} else if (interaction.isAutocomplete()) {
			handleAutocomplete(interaction)
		} else if (interaction.isModalSubmit()) {
			handleModalSubmit(interaction)
		}
	},
} satisfies Event<Events.InteractionCreate>

// ChatInputCommand（スラッシュコマンド）の処理
const handleChatInputCommand = (
	interaction: ChatInputCommandInteraction<CacheType>
) => {
	const command = interaction.client.commands.get(interaction.commandName)
	const cooldown = interaction.client.cooldowns.get(
		`${interaction.commandName}-${interaction.user.id}`
	)
	if (!command) {
		return
	}

	// クールダウンのチェック
	if (command.cooldown && cooldown) {
		if (Date.now() < cooldown) {
			// クールダウン中の場合、ユーザーに待つように通知
			const embed = new EmbedBuilder()
				.setTitle('🌀 クールダウン')
				.setDescription(
					`あと${Math.floor((cooldown - Date.now()) / 1000)}秒待ってからこのコマンドを再度使用できます。`
				)
				.setColor(colors.warn)
			interaction.reply({
				embeds: [embed],
				ephemeral: true,
			})
			setTimeout(() => interaction.deleteReply(), 5000)
			return
		}
	}
	// クールダウン設定
	if (command.cooldown) {
		interaction.client.cooldowns.set(
			`${interaction.commandName}-${interaction.user.id}`,
			Date.now() + command.cooldown * 1000
		)
		setTimeout(
			() =>
				interaction.client.cooldowns.delete(
					`${interaction.commandName}-${interaction.user.id}`
				),
			command.cooldown * 1000
		)
	}
	try {
		// コマンドの実行
		command.execute(interaction)
	} catch (error) {
		logger.error(error)
		interaction.reply({
			content: 'コマンドの実行中にエラーが発生しました。',
			ephemeral: true,
		})
	}
}

// Autocomplete（オートコンプリート）の処理
const handleAutocomplete = (
	interaction: AutocompleteInteraction<CacheType>
) => {
	const command = interaction.client.commands.get(interaction.commandName)
	if (!command) {
		return
	}
	try {
		if (!command.autocomplete) {
			return
		}
		command.autocomplete(interaction)
	} catch (error) {
		logger.error(error)
	}
}

// ModalSubmit（モーダル送信）の処理
const handleModalSubmit = (interaction: ModalSubmitInteraction<CacheType>) => {
	const command = interaction.client.commands.get(interaction.customId)
	if (!command) {
		return
	}
	try {
		if (!command.modal) {
			return
		}
		command.modal(interaction)
	} catch (error) {
		logger.error(error)
	}
}

const handleButton = (interaction: ButtonInteraction<CacheType>) => {
	const command = interaction.client.commands.get(interaction.customId)
	if (!command) {
		return
	}
	try {
		if (!command.button) {
			return
		}
		command.button(interaction)
	} catch (error) {
		logger.error(error)
	}
}
