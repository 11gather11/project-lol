import { Glob } from 'bun'
import { type Client, Events } from 'discord.js'
import { logger } from '@/logger'
import type { Event } from '@/types/event'

/**
 * Validates if an object conforms to the Event interface.
 * Checks required fields and Discord.js event name validity.
 *
 * @param event - Object to validate as an Event
 * @returns True if valid Event, false otherwise
 */
const isValidEvent = (event: unknown): event is Event => {
	if (!event || typeof event !== 'object') return false

	const evt = event as Record<string, unknown>

	// Required fields
	if (!evt.name || typeof evt.name !== 'string') return false
	if (typeof evt.once !== 'boolean') return false
	if (!evt.execute || typeof evt.execute !== 'function') return false

	// Validate event name is a valid Discord.js event
	const validEvents = Object.values(Events) as string[]
	if (!validEvents.includes(evt.name)) {
		logger.warn(`Unknown Discord.js event: ${evt.name}`)
		return false
	}

	return true
}

/**
 * Loads Discord.js events from the events directory in parallel.
 * Validates events and registers them to the Discord.js client.
 *
 * @param client - Discord.js Client instance to register events to
 * @returns Promise that resolves when all events are processed
 */
export const loadEvents = async (client: Client): Promise<void> => {
	const glob = new Glob('*/index.{js,ts}')
	const dir = `${import.meta.dir}/../events`

	// Collect all file paths first for parallel loading
	const eventFiles: string[] = []
	for await (const file of glob.scan(dir)) {
		eventFiles.push(file)
	}

	// Load events in parallel
	const loadEventPromises = eventFiles.map(async (file) => {
		try {
			const eventModule = await import(`${dir}/${file}`)
			const event = eventModule.default

			if (!event) {
				logger.error(`Event file ${file} does not export a default event`)
				return { file, event: null, success: false }
			}

			return { file, event, success: true }
		} catch (error) {
			if (error instanceof SyntaxError) {
				logger.error(`Syntax error in event file ${file}: ${error.message}`)
			} else if (error instanceof TypeError) {
				logger.error(`Type error loading event ${file}: ${error.message}`)
			} else {
				logger.error(`Failed to load event ${file}:`, error)
			}
			return { file, event: null, success: false, error }
		}
	})

	const results = await Promise.allSettled(loadEventPromises)

	// Register events after all imports complete
	let loadedCount = 0
	let failedCount = 0

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.success) {
			const { file, event } = result.value

			if (!isValidEvent(event)) {
				logger.error(`Invalid event structure in ${file}:`, {
					hasName: !!event?.name,
					hasOnce: typeof event?.once === 'boolean',
					hasExecute: typeof event?.execute === 'function',
				})
				failedCount++
				continue
			}

			if (event.once) {
				client.once(event.name, (...parameters) => {
					try {
						return event.execute(...parameters)
					} catch (error) {
						logger.error(`Error in event ${event.name}:`, error)
					}
				})
			} else {
				client.on(event.name, (...parameters) => {
					try {
						return event.execute(...parameters)
					} catch (error) {
						logger.error(`Error in event ${event.name}:`, error)
					}
				})
			}

			logger.debug(`Loaded event: ${event.name}`)
			loadedCount++
		} else {
			failedCount++
		}
	}

	logger.info(
		`Event loading complete: ${loadedCount} loaded, ${failedCount} failed`
	)
}
