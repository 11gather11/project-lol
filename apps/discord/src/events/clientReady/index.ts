import { Events } from 'discord.js'
import type { Event } from '@/types/event'

export default {
	name: Events.ClientReady,
	once: true,

	execute: async (client) => {
		console.log(`Ready! Logged in as ${client.user?.tag}`)
	},
} satisfies Event<Events.ClientReady>
