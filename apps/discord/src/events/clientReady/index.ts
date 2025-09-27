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
		try {
			logger.info(`ログインしました: ${client.user?.tag}`)

			// APIサーバーに接続
			const res = await apiClient.index.$get()
			if (!res.ok) {
				logger.error('APIサーバーへの接続に失敗しました:', res.statusText)
			}

			logger.info('APIサーバーに接続しました')
		} catch (error) {
			logger.error('クライアントの準備中にエラーが発生しました:', error)
		}
	},
} satisfies Event<Events.ClientReady>
