import { SuiClient } from '@mysten/sui/client'
import { WarpChainInfo, WarpClientConfig, getProviderConfig } from '@vleap/warps'

export const getConfiguredSuiClient = (config: WarpClientConfig, chain: WarpChainInfo) => {
  const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
  return new SuiClient({ url: providerConfig.url })
}
