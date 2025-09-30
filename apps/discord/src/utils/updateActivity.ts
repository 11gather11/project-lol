import { ActivityType, type Client } from 'discord.js'
import version from '@/../package.json'
import { logger } from '@/lib/logger'

/**
 * ボットのアクティビティを現在参加中のサーバー数に基づいて更新します
 */
export const updateActivity = (client: Client<true>): void => {
	const guildCount = client.guilds.cache.size

	const activity = `${guildCount}個のサーバーに参加中 | v ${version.version}`

	client.user.setActivity(activity, {
		type: ActivityType.Custom,
	})

	logger.info(`アクティビティを更新: ${activity}`)
}
