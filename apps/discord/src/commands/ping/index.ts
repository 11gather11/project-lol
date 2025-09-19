import type { Command } from '@/types/command'

export default {
	command: {
		name: 'ping',
		description: 'Ping Pong!',
	},
	execute: async (interaction) => {
		await interaction.reply('Pong!')
	},
} satisfies Command
