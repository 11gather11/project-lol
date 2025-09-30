import { type Client, REST, Routes } from 'discord.js'
import { logger } from '@/logger'

/**
 * コマンドデプロイメントの設定インターface
 */
interface DeploymentConfig {
	scope: 'global' | 'guild'
	route: `/${string}`
}

/**
 * デプロイメント設定を決定します。
 * 環境変数とクライアントの状態に基づいて適切な設定を返します。
 *
 * @returns デプロイメント設定オブジェクト
 */
const getDeploymentConfig = (): DeploymentConfig => {
	const isProduction = import.meta.env.NODE_ENV === 'production'

	if (isProduction) {
		return {
			scope: 'global',
			route: Routes.applicationCommands(Bun.env.DISCORD_CLIENT_ID),
		}
	}

	return {
		scope: 'guild',
		route: Routes.applicationGuildCommands(
			Bun.env.DISCORD_CLIENT_ID,
			Bun.env.DISCORD_GUILD_ID
		),
	}
}

/**
 * Discord.jsクライアントからスラッシュコマンドをデプロイします。
 *
 * @param client - コマンドを含むDiscord.js Clientインスタンス
 */
export const deployCommands = async (client: Client): Promise<void> => {
	// クライアントcommands collectionの存在確認
	if (!client.commands) {
		logger.error('client.commands Collectionが初期化されていません')
		return
	}

	// コマンドデータの抽出
	const commands = Array.from(client.commands.values()).map(
		(cmd) => cmd.command
	)

	if (commands.length === 0) {
		logger.warn('デプロイするコマンドがありません')
		return
	}

	// デプロイメント設定の決定
	const config = getDeploymentConfig()

	logger.info(
		`${commands.length}個のコマンドを${config.scope}スコープにデプロイを開始します`
	)

	// REST APIクライアントの初期化とデプロイ
	try {
		const rest = new REST({ version: '10' }).setToken(Bun.env.DISCORD_TOKEN)
		await rest.put(config.route, { body: commands })

		logger.success(
			`${commands.length}個のコマンドを${config.scope}スコープにデプロイしました`
		)
	} catch (error) {
		const err = error as Error
		logger.error(`コマンドデプロイメントが失敗しました: ${err.message}`)
		throw error
	}
}
