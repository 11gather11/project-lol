import type {
	AutocompleteInteraction,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	ModalSubmitInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js'

export interface Command {
	command: RESTPostAPIChatInputApplicationCommandsJSONBody
	execute: (interaction: ChatInputCommandInteraction) => void | Promise<void>
	autocomplete?: (interaction: AutocompleteInteraction) => void | Promise<void>
	modal?: (
		interaction: ModalSubmitInteraction<CacheType>
	) => void | Promise<void>
	button?: (interaction: ButtonInteraction) => void | Promise<void>
}
