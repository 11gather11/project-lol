import { Events } from 'discord.js'
import type { Event } from '@/types/event'

export default {
	name: Events.ClientReady,
	once: true,

	execute: async (_client) => {},
} satisfies Event<Events.ClientReady>
