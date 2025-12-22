import { WalletProviderFactory, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { GaupaWalletProvider } from './GaupaWalletProvider'
import { ProviderConfig } from './types'

export const createGaupaWalletProvider = (gaupaConfig: ProviderConfig): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => new GaupaWalletProvider(config, chain, gaupaConfig)
}
