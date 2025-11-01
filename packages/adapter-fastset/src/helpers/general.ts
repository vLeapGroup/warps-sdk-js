import { WarpChainInfo, WarpClientConfig, getProviderConfig } from '@vleap/warps'
import { FastsetClient } from '../sdk'

export const getConfiguredFastsetClient = (config: WarpClientConfig, chain: WarpChainInfo) => {
  const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
  return new FastsetClient(providerConfig.url)
}
