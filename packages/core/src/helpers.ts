import { Config } from './config'
import { ChainEnv, WarpInfo } from './types'

export const getChainId = (env: ChainEnv): string => {
  if (env === 'devnet') return 'D'
  if (env === 'testnet') return 'T'
  return '1'
}

export const getLatestProtocolIdentifier = (): string => `${Config.ProtocolName}:${Config.LatestVersion}`

export const toTypedWarpInfo = (warpInfo: any): WarpInfo => ({
  hash: warpInfo.hash.toString('hex'),
  alias: warpInfo.alias?.toString() || null,
  trust: warpInfo.trust.toString(),
  creator: warpInfo.creator.toString(),
  createdAt: warpInfo.created_at.toNumber(),
})
