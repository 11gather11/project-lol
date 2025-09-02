import { EmbedBuilder, type Interaction } from 'discord.js'
import { config } from '@/config/config'

// エラーメッセージを送信する関数
export const sendErrorReply = async (
	interaction: Interaction,
	message: string
) => {
	const errorEmbed = new EmbedBuilder()
		.setTitle('⛔️ エラー')
		.setDescription(message)
		.setColor(config.colors.error) // 赤色

	if (!interaction.isCommand()) {
		return
	}

	await interaction.reply({
		embeds: [errorEmbed],
		ephemeral: true,
	})
}
