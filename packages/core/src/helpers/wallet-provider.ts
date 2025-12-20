import { WalletProvider, WalletProviderFactory, WarpChainInfo, WarpClientConfig } from '../types'

export function createDefaultWalletProvider(
  config: WarpClientConfig,
  chain: WarpChainInfo,
  rpcProvider?: any
): WalletProvider | null {
  if (config.walletProviders?.[chain.name]) {
    return config.walletProviders[chain.name](config, chain)
  }

  return null
}
