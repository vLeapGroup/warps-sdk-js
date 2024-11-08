import { Config } from './config'
import { ChainEnv } from './types'

export const getChainId = (env: ChainEnv): string => {
  if (env === 'devnet') return 'D'
  if (env === 'testnet') return 'T'
  return '1'
}

export const getLatestProtocolIdentifier = (): string => `${Config.ProtocolName}:${Config.LatestVersion}`
