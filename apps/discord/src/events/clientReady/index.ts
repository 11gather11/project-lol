import type { AppType } from '@project-lol/server'
import { Events } from 'discord.js'
import { hc } from 'hono/client'
import { logger } from '@/logger'
import { env } from '@/schema/env'
import type { Event } from '@/types/event'

const apiClient = hc<AppType>(env.API_BASE_URL)

export default {
	name: Events.ClientReady,
	once: true,

	execute: async (client) => {
		logger.info(`ログインしました: ${client.user?.tag}`)

		// APIサーバーに接続
		const res = await apiClient.index.$get()
		if (!res.ok) {
			logger.error('APIサーバーへの接続に失敗しました:', res.statusText)
			return
		}

		logger.info('APIサーバーに接続しました')
	},
} satisfies Event<Events.ClientReady>
