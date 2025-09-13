import { DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { getProviderUrl, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

// Native tokens have identifiers that do not follow the ESDT token format, e.g. EGLD, VIBE
export const isNativeToken = (identifier: string): boolean => !identifier.includes('-')

export const getNormalizedTokenIdentifier = (identifier: string): string =>
  isNativeToken(identifier) ? `${identifier}-000000` : identifier

export const getMultiversxEntrypoint = (chainInfo: WarpChainInfo, env: WarpChainEnv, config?: WarpClientConfig): NetworkEntrypoint => {
  const clientName = 'warp-sdk'
  const kind = 'api'
  const apiUrl = config ? getProviderUrl(config, chainInfo.name, env, chainInfo.defaultApiUrl) : chainInfo.defaultApiUrl
  if (env === 'devnet') return new DevnetEntrypoint({ url: apiUrl, kind, clientName })
  if (env === 'testnet') return new TestnetEntrypoint({ url: apiUrl, kind, clientName })
  return new MainnetEntrypoint({ url: apiUrl, kind, clientName })
}
