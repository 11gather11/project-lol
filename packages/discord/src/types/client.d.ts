import type {
	AutocompleteInteraction,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	Collection,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

export type SlashCommandBuilderType =
	| SlashCommandBuilder
	| SlashCommandSubcommandsOnlyBuilder
	| SlashCommandOptionsOnlyBuilder

export interface Command {
	command: SlashCommandBuilderType
	execute: (interaction: ChatInputCommandInteraction) => void
	autocomplete?: (interaction: AutocompleteInteraction) => void
	modal?: (interaction: ModalSubmitInteraction<CacheType>) => void
	button?: (interaction: ButtonInteraction) => void
	cooldown?: number //秒数
}

export interface BotEvent {
	name: string
	once?: boolean | false
	// biome-ignore lint/suspicious/noExplicitAny: 	// any 型はイベントの引数が多様なため使用
	execute: (...args: any) => void | Promise<void>
}

declare module 'discord.js' {
	interface Client {
		commands: Collection<string, Command>
		cooldowns: Collection<string, number>
	}
}
