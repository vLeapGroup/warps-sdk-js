import { WalletProviderFactory, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { GaupaWalletProvider } from './GaupaWalletProvider'
import { ProviderConfig } from './types'

export const createGaupaWalletProvider = (gaupaConfig: ProviderConfig): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => new GaupaWalletProvider(config, chain, gaupaConfig)
}
