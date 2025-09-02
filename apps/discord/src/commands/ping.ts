import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '@/types/client'

const command: Command = {
	command: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	execute: async (interaction) => {
		await interaction.reply('Pong!')
	},
}

export default command
