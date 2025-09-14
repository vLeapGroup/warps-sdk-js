import { SuiClient } from '@mysten/sui/client'
import { WarpChainInfo, WarpClientConfig, getProviderUrl } from '@vleap/warps'

export const getConfiguredSuiClient = (config: WarpClientConfig, chain: WarpChainInfo) => {
  const apiUrl = getProviderUrl(config, chain.name, config.env, chain.defaultApiUrl)
  return new SuiClient({ url: apiUrl })
}
