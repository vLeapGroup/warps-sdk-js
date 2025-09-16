import { WarpChainInfo, WarpClientConfig, getProviderUrl } from '@vleap/warps'
import { FastsetClient } from '../sdk'

export const getConfiguredFastsetClient = (config: WarpClientConfig, chain: WarpChainInfo) => {
  const proxyUrl = getProviderUrl(config, chain.name, config.env, chain.defaultApiUrl)
  return new FastsetClient(proxyUrl)
}
