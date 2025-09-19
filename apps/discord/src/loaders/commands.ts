import { Glob } from 'bun'
import { type Client, Collection } from 'discord.js'
import { logger } from '@/logger'
import type { Command } from '@/types/command'

/**
 * Validates if an object conforms to the Command interface.
 * Checks required fields, Discord.js API compliance, and optional handlers.
 *
 * @param cmd - Object to validate as a Command
 * @returns True if valid Command, false otherwise
 */
const isValidCommand = (cmd: unknown): cmd is Command => {
	if (!cmd || typeof cmd !== 'object') return false

	const command = cmd as Record<string, unknown>

	// Required fields validation
	if (!command.command || typeof command.command !== 'object') return false
	if (!command.execute || typeof command.execute !== 'function') return false

	// Validate Discord.js command structure requirements
	const commandData = command.command as Record<string, unknown>
	if (!commandData.name || typeof commandData.name !== 'string') return false
	if (!commandData.description || typeof commandData.description !== 'string')
		return false

	// Validate command name requirements (Discord.js restrictions)
	const nameRegex = /^[\w-]{1,32}$/
	if (!nameRegex.test(commandData.name as string)) {
		logger.warn(
			`Command name "${commandData.name}" must be 1-32 characters and contain only letters, numbers, - and _`
		)
		return false
	}

	// Validate description length (Discord.js restriction)
	if ((commandData.description as string).length > 100) {
		logger.warn(
			`Command description for "${commandData.name}" exceeds 100 character limit`
		)
		return false
	}

	// Optional fields validation
	if (command.autocomplete && typeof command.autocomplete !== 'function')
		return false
	if (command.modal && typeof command.modal !== 'function') return false
	if (command.button && typeof command.button !== 'function') return false
	if (command.cooldown && typeof command.cooldown !== 'number') return false

	// Validate cooldown range (reasonable limits)
	if (
		command.cooldown &&
		typeof command.cooldown === 'number' &&
		(command.cooldown < 0 || command.cooldown > 86400)
	) {
		logger.warn(
			`Command "${commandData.name}" cooldown must be between 0-86400 seconds`
		)
		return false
	}

	return true
}

/**
 * Loads Discord.js slash commands from the commands directory in parallel.
 * Validates commands and registers them to client.commands Collection.
 * Runtime error handling is done in interactionCreate handler.
 *
 * @param client - Discord.js Client instance to register commands to
 * @returns Promise that resolves when all commands are processed
 */
export const loadCommands = async (client: Client): Promise<void> => {
	// Initialize commands collection if it doesn't exist
	if (!client.commands) {
		client.commands = new Collection<string, Command>()
	}

	const glob = new Glob('*/index.{js,ts}')
	const dir = `${import.meta.dir}/../commands`

	// Collect all file paths first for parallel loading
	const commandFiles: string[] = []
	for await (const file of glob.scan(dir)) {
		commandFiles.push(file)
	}

	// Load commands in parallel
	const loadCommandPromises = commandFiles.map(async (file) => {
		try {
			const commandModule = await import(`${dir}/${file}`)
			const command = commandModule.default

			if (!command) {
				logger.error(`Command file ${file} does not export a default command`)
				return { file, command: null, success: false }
			}

			return { file, command, success: true }
		} catch (error) {
			if (error instanceof SyntaxError) {
				logger.error(`Syntax error in command file ${file}: ${error.message}`)
			} else if (error instanceof TypeError) {
				logger.error(`Type error loading command ${file}: ${error.message}`)
			} else {
				logger.error(`Failed to load command ${file}:`, error)
			}
			return { file, command: null, success: false, error }
		}
	})

	const results = await Promise.allSettled(loadCommandPromises)

	// Register commands after all imports complete
	let loadedCount = 0
	let failedCount = 0
	const duplicateCommands = new Set<string>()

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.success) {
			const { file, command } = result.value

			if (!isValidCommand(command)) {
				logger.error(`Invalid command structure in ${file}:`, {
					hasCommand: !!command?.command,
					hasExecute: typeof command?.execute === 'function',
					commandName: command?.command?.name || 'unknown',
					hasValidName: typeof command?.command?.name === 'string',
					hasValidDescription:
						typeof command?.command?.description === 'string',
				})
				failedCount++
				continue
			}

			// Check for duplicate command names
			const commandName = command.command.name
			if (client.commands.has(commandName)) {
				logger.error(`Duplicate command name "${commandName}" found in ${file}`)
				duplicateCommands.add(commandName)
				failedCount++
				continue
			}

			client.commands.set(commandName, command)
			logger.debug(`Loaded command: ${commandName}`)
			loadedCount++
		} else {
			failedCount++
		}
	}

	// Log summary with detailed information
	logger.info(
		`Command loading complete: ${loadedCount} loaded, ${failedCount} failed`
	)

	if (duplicateCommands.size > 0) {
		logger.warn(
			`Found duplicate command names: ${Array.from(duplicateCommands).join(', ')}`
		)
	}

	if (loadedCount === 0 && commandFiles.length > 0) {
		logger.warn(
			'No commands were successfully loaded. Check command file structure and exports.'
		)
	}
}
