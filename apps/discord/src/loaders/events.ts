import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Client } from 'discord.js'
import { logger } from '@/logger'
import type { Event } from '@/types/event'

const isValidEvent = (evt: unknown): evt is Event => {
	if (!evt || typeof evt !== 'object') return false
	const event = evt as Record<string, unknown>

	// Required fields
	if (!event.name || typeof event.name !== 'string') return false
	if (!event.execute || typeof event.execute !== 'function') return false
	// Optional fields validation
	if (event.once && typeof event.once !== 'boolean') return false

	return true
}

export const loadEvents = async (client: Client): Promise<void> => {
	const dir = join(import.meta.dirname, '../events')
	for (const file of await readdir(dir)) {
		if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

		try {
			const { default: event } = await import(join(dir, file))

			if (!isValidEvent(event)) {
				logger.error(`Invalid event structure in file: ${file}`)
				continue
			}

			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args))
			} else {
				client.on(event.name, (...args) => event.execute(...args))
			}

			logger.success(`Loaded event: ${file}`)
		} catch (error) {
			logger.error(`Failed to load event ${file}:`, error)
		}
	}
}
