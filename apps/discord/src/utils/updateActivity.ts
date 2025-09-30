import { ActivityType, type Client } from 'discord.js'
import { logger } from '@/lib/logger'

/**
 * ボットのアクティビティを現在参加中のサーバー数に基づいて更新します
 */
export const updateActivity = (client: Client<true>): void => {
	const guildCount = client.guilds.cache.size

	const activity = `${guildCount}個のサーバー`

	client.user.setActivity(activity, {
		type: ActivityType.Competing,
	})

	logger.info(`アクティビティを更新: ${activity}`)
}
