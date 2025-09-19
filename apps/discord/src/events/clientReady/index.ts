import { Events } from 'discord.js'
import { logger } from '@/logger'
import type { Event } from '@/types/event'

export default {
	name: Events.ClientReady,
	once: true,

	execute: async (client) => {
		logger.info(`ログインしました: ${client.user?.tag}`)
	},
} satisfies Event<Events.ClientReady>
