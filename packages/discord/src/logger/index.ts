import { WebhookClient } from 'discord.js'
import winston from 'winston'
import { env } from '@/schema/env'

// WebhookClient のインスタンスを作成（URL が存在する場合のみ）
const webhookLogger = new WebhookClient({ url: env.DISCORD_LOG_WEBHOOK_URL })

// ログレベルと色の型定義
type Colors = 'red' | 'yellow' | 'green' | 'blue' | 'magenta' | 'white'
type LogLevel = 'error' | 'warn' | 'success' | 'info' | 'http' | 'debug'

// ログレベルと色のマッピング
const levelColors: Record<LogLevel, Colors> = {
	error: 'red',
	warn: 'yellow',
	success: 'green',
	info: 'blue',
	http: 'magenta',
	debug: 'white',
}

// ANSI カラーコードの定義
const ansiColors: Record<Colors | 'reset', string> = {
	red: '\u001b[31m',
	yellow: '\u001b[33m',
	green: '\u001b[32m',
	blue: '\u001b[34m',
	magenta: '\u001b[35m',
	white: '\u001b[37m',
	reset: '\u001b[0m',
}

// テキストに ANSI カラーを適用する関数
const applyColor = (color: Colors, text: string): string => {
	const colorCode = ansiColors[color]
	const resetCode = ansiColors.reset
	return `${colorCode}${text}${resetCode}`
}

// 日付をフォーマットする関数
const getFormattedDate = (): string => {
	return new Date().toLocaleString('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	})
}

// メッセージを文字列に変換する関数（複数引数対応）
const formatMessage = (args: unknown[]): string => {
	return args
		.map((arg) => {
			if (typeof arg === 'string') {
				return arg
			}
			if (arg instanceof Error) {
				return `${arg.name}\n${arg.message}\n${arg.stack}`
			}
			try {
				// オブジェクトや配列を JSON 文字列に変換
				return JSON.stringify(arg, null, 2)
			} catch {
				// それ以外の型は文字列に変換
				return String(arg)
			}
		})
		.join(' ')
}

// Discord の Webhook にメッセージを送信する関数
const sendWebhook = async (args: unknown[], level: LogLevel) => {
	if (!webhookLogger) {
		return
	}

	const date = getFormattedDate()
	const color = levelColors[level]
	const formattedMessage = formatMessage(args)
	const styledLevel = applyColor(color, level.toUpperCase())
	const content = `\`\`\`ansi\n[${date}] [${styledLevel}]: ${formattedMessage}\`\`\``

	// エラーレベルの場合は @everyone を付加
	const webhookMessage = {
		username: 'Logs',
		content: level === 'error' ? `@everyone ${content}` : content,
	}
	try {
		await webhookLogger.send(webhookMessage)
	} catch (error) {
		logger.error('Webhook 送信に失敗しました:', (error as Error).message)
	}
}

// winston のカスタムログレベルを定義
const customLevels = {
	levels: {
		error: 0,
		warn: 1,
		success: 2,
		info: 3,
		http: 4,
		debug: 5,
	},
	colors: levelColors,
}

// winston にカスタムカラーを追加
winston.addColors(customLevels.colors)

// ログレベルに色を適用するためのフォーマッター
const colorizer = winston.format.colorize()

// winston ロガーの作成
const winstonLogger = winston.createLogger({
	levels: customLevels.levels, // カスタムログレベルを適用
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp({ format: getFormattedDate() }), // タイムスタンプを追加
		winston.format.printf(({ level, message, timestamp }) => {
			return `[${timestamp}] [${level.toUpperCase()}]: ${message}`
		})
	),
	transports: [
		// コンソールへのログ出力
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.timestamp({ format: getFormattedDate() }), // タイムスタンプを追加
				winston.format.printf(({ level, message, timestamp }) => {
					// ログレベルをカラー化
					const coloredLevel = colorizer.colorize(level, level.toUpperCase())
					return `[${timestamp}] [${coloredLevel}]: ${message}`
				})
			),
		}),
	],
})

// ロガーのエクスポート
export const logger = {} as Record<LogLevel, (...args: unknown[]) => void>

// 使用するログレベルのリスト
const logLevels: LogLevel[] = [
	'error',
	'warn',
	'success',
	'info',
	'http',
	'debug',
]

// 各ログレベルに対応するメソッドを logger オブジェクトに追加
for (const level of logLevels) {
	logger[level] = (...args: unknown[]) => {
		const message = formatMessage(args)
		// winston にログを記録
		winstonLogger.log(level, message)
		// 特定のログレベルの場合は Webhook にも送信
		if (['error', 'warn', 'success'].includes(level)) {
			sendWebhook(args, level)
		}
	}
}
