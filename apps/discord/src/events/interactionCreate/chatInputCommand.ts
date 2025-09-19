import {
	type CacheType,
	type ChatInputCommandInteraction,
	EmbedBuilder,
} from 'discord.js'
import { colors } from '@/config/colors'
import { logger } from '@/logger'

export const handleChatInputCommand = async (
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
			await interaction.reply({
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
		await command.execute(interaction)
	} catch (error) {
		logger.error(`Error executing command "${interaction.commandName}":`, error)

		const errorMessage = 'コマンドの実行中にエラーが発生しました。'

		try {
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: errorMessage,
					ephemeral: true,
				})
			} else {
				await interaction.reply({
					content: errorMessage,
					ephemeral: true,
				})
			}
		} catch (replyError) {
			logger.error(
				`Failed to send error message for command "${interaction.commandName}":`,
				replyError
			)
		}
	}
}
