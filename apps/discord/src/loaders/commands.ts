import { Glob } from 'bun'
import { type Client, Collection } from 'discord.js'
import { logger } from '@/logger'
import type { Command } from '@/types/command'

/**
 * オブジェクトがCommand interfaceに準拠しているかを検証します。
 * 必須フィールド、Discord.js API準拠、オプションハンドラーをチェックします。
 *
 * @param cmd - Commandとして検証するオブジェクト
 * @returns 有効なCommandの場合true、そうでなければfalse
 */
const isValidCommand = (cmd: unknown): cmd is Command => {
	if (!cmd || typeof cmd !== 'object') return false

	const command = cmd as Record<string, unknown>

	// 必須フィールドの検証
	if (!command.command || typeof command.command !== 'object') return false
	if (!command.execute || typeof command.execute !== 'function') return false

	// Discord.jsコマンド構造の要件を検証
	const commandData = command.command as Record<string, unknown>
	if (!commandData.name || typeof commandData.name !== 'string') return false
	if (!commandData.description || typeof commandData.description !== 'string')
		return false

	// コマンド名の要件を検証（Discord.jsの制限）
	const nameRegex = /^[\w-]{1,32}$/
	if (!nameRegex.test(commandData.name as string)) {
		logger.warn(
			`コマンド名 "${commandData.name}" は1-32文字で、英数字、-、_のみ使用可能です`
		)
		return false
	}

	// 説明文の長さを検証（Discord.jsの制限）
	if ((commandData.description as string).length > 100) {
		logger.warn(
			`コマンド "${commandData.name}" の説明が100文字制限を超えています`
		)
		return false
	}

	// オプションフィールドの検証
	if (command.autocomplete && typeof command.autocomplete !== 'function')
		return false
	if (command.modal && typeof command.modal !== 'function') return false
	if (command.button && typeof command.button !== 'function') return false
	if (command.cooldown && typeof command.cooldown !== 'number') return false

	// クールダウン範囲の検証（合理的な制限）
	if (
		command.cooldown &&
		typeof command.cooldown === 'number' &&
		(command.cooldown < 0 || command.cooldown > 86400)
	) {
		logger.warn(
			`コマンド "${commandData.name}" のクールダウンは0-86400秒の範囲で設定してください`
		)
		return false
	}

	return true
}

/**
 * commandsディレクトリからDiscord.jsスラッシュコマンドを並列で読み込みます。
 * コマンドを検証してclient.commands Collectionに登録します。
 * 実行時エラーハンドリングはinteractionCreateハンドラーで行われます。
 *
 * @param client - コマンドを登録するDiscord.js Clientインスタンス
 * @returns 全コマンドの処理が完了したときに解決するPromise
 */
export const loadCommands = async (client: Client): Promise<void> => {
	// コマンドコレクションが存在しない場合は初期化
	if (!client.commands) {
		client.commands = new Collection<string, Command>()
	}

	const glob = new Glob('*/index.{js,ts}')
	const dir = `${import.meta.dir}/../commands`

	// 並列読み込みのためにまず全ファイルパスを収集
	const commandFiles: string[] = []
	for await (const file of glob.scan(dir)) {
		commandFiles.push(file)
	}

	// コマンドを並列で読み込み
	const loadCommandPromises = commandFiles.map(async (file) => {
		try {
			const commandModule = await import(`${dir}/${file}`)
			const command = commandModule.default

			if (!command) {
				logger.error(
					`コマンドファイル ${file} がデフォルトコマンドをエクスポートしていません`
				)
				return { file, command: null, success: false }
			}

			return { file, command, success: true }
		} catch (error) {
			if (error instanceof SyntaxError) {
				logger.error(`コマンドファイル ${file} で構文エラー: ${error.message}`)
			} else if (error instanceof TypeError) {
				logger.error(`コマンド ${file} 読み込み時に型エラー: ${error.message}`)
			} else {
				logger.error(`コマンド ${file} の読み込みに失敗:`, error)
			}
			return { file, command: null, success: false, error }
		}
	})

	const results = await Promise.allSettled(loadCommandPromises)

	// 全インポート完了後にコマンドを登録
	let loadedCount = 0
	let failedCount = 0
	const duplicateCommands = new Set<string>()

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value.success) {
			const { file, command } = result.value

			if (!isValidCommand(command)) {
				logger.error(`無効なコマンド構造 ${file}:`, {
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

			// 重複コマンド名をチェック
			const commandName = command.command.name
			if (client.commands.has(commandName)) {
				logger.error(
					`重複コマンド名 "${commandName}" が ${file} で見つかりました`
				)
				duplicateCommands.add(commandName)
				failedCount++
				continue
			}

			client.commands.set(commandName, command)
			logger.debug(`コマンドを読み込み: ${commandName}`)
			loadedCount++
		} else {
			failedCount++
		}
	}

	// 詳細情報とともにサマリーをログ出力
	logger.info(
		`コマンド読み込み完了: ${loadedCount}個読み込み、${failedCount}個失敗`
	)

	if (duplicateCommands.size > 0) {
		logger.warn(
			`重複コマンド名が見つかりました: ${Array.from(duplicateCommands).join(', ')}`
		)
	}

	if (loadedCount === 0 && commandFiles.length > 0) {
		logger.warn(
			'コマンドが正常に読み込まれませんでした。コマンドファイルの構造とエクスポートを確認してください。'
		)
	}
}
