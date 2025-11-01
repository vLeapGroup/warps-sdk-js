import { WarpChain, WarpChainEnv, WarpClientConfig, WarpProviderConfig } from '../types'

export const getProviderConfig = (
  config: WarpClientConfig,
  chain: WarpChain,
  env: WarpChainEnv,
  defaultProvider: string
): WarpProviderConfig => {
  const customProviders = config.preferences?.providers?.[chain]
  if (!customProviders?.[env]) return { url: defaultProvider }
  if (typeof customProviders[env] === 'string') return { url: customProviders[env] }
  return customProviders[env]
}
