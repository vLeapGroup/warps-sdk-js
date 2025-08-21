import { WarpChain, WarpChainEnv, WarpClientConfig, WarpProviderConfig } from '../types'

export const getProviderUrl = (
  config: WarpClientConfig,
  chain: WarpChain,
  env: WarpChainEnv,
  defaultProvider: string
): string => {
  const customProviders = config.providers?.[chain]
  if (customProviders?.[env]) {
    return customProviders[env]
  }
  return defaultProvider
}

export const getProviderConfig = (
  config: WarpClientConfig,
  chain: WarpChain
): WarpProviderConfig | undefined => {
  return config.providers?.[chain]
}
