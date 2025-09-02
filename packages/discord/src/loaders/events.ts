import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Client } from 'discord.js'
import { logger } from '@/logger'

export const deployEvents = async (client: Client) => {
	const eventsDir = join(__dirname, '../events')

	for (const file of readdirSync(eventsDir)) {
		if (!(file.endsWith('.ts') || file.endsWith('.js'))) {
			continue
		}
		const { default: event } = await import(join(eventsDir, file))
		event.once
			? client.once(event.name, (...args) => event.execute(...args))
			: client.on(event.name, (...args) => event.execute(...args))
		logger.success(`イベントファイル ${file} を読み込みました`)
	}
}
