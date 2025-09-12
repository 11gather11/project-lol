import type { ClientEvents } from 'discord.js'

export interface Event<
	EventName extends keyof ClientEvents = keyof ClientEvents,
> {
	execute: (...parameters: ClientEvents[EventName]) => Promise<void> | void
	name: EventName
	once?: boolean
}
