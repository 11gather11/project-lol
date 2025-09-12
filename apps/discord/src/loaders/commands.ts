import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Client } from 'discord.js'
import { logger } from '@/logger'
import type { Command } from '@/types/command'

const isValidCommand = (cmd: unknown): cmd is Command => {
	if (!cmd || typeof cmd !== 'object') return false

	const command = cmd as Record<string, unknown>

	// Required fields
	if (!command.command || typeof command.command !== 'object') return false
	if (!command.execute || typeof command.execute !== 'function') return false

	// Optional fields validation
	if (command.autocomplete && typeof command.autocomplete !== 'function')
		return false
	if (command.modal && typeof command.modal !== 'function') return false
	if (command.button && typeof command.button !== 'function') return false
	if (command.cooldown && typeof command.cooldown !== 'number') return false

	return true
}

export const loadCommands = async (client: Client): Promise<void> => {
	const dir = join(import.meta.dirname, '../commands')
	for (const file of await readdir(dir)) {
		if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

		try {
			const { default: command } = await import(join(dir, file))

			if (!isValidCommand(command)) {
				logger.error(`Invalid command structure in file: ${file}`)
				continue
			}

			client.commands.set(command.command.name, command)
			logger.success(`Loaded command: ${file}`)
		} catch (error) {
			logger.error(`Failed to load command ${file}:`, error)
		}
	}
}
