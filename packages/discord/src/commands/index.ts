import type { Command } from '@/types/client'
import jankenCommand from './janken'

export const commands: readonly Command[] = [
	jankenCommand,
	// 他のコマンドをここに追加
] as const

// コマンド名でのマップも提供（高速検索用）
export const commandMap = new Map(
	commands.map((cmd) => [cmd.command.name, cmd] as const)
)

// 型安全なコマンド名の型定義
export type CommandName = (typeof commands)[number]['command']['name']
