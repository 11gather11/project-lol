import { Events } from 'discord.js'
import { logger } from '@/lib/logger'
import type { Event } from '@/types/event'
import { updateActivity } from '@/utils/updateActivity'

export default {
	name: Events.GuildCreate,
	once: false,

	execute: async (guild) => {
		logger.info(`新しいサーバーに参加: ${guild.name} (ID: ${guild.id})`)

		// アクティビティを更新
		updateActivity(guild.client)
	},
} satisfies Event<Events.GuildCreate>
