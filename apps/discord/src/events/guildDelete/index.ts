import { Events } from 'discord.js'
import { logger } from '@/lib/logger'
import type { Event } from '@/types/event'
import { updateActivity } from '@/utils/updateActivity'

export default {
	name: Events.GuildDelete,
	once: false,

	execute: async (guild) => {
		logger.info(`サーバーから退出: ${guild.name} (ID: ${guild.id})`)

		// アクティビティを更新
		updateActivity(guild.client)
	},
} satisfies Event<Events.GuildDelete>
