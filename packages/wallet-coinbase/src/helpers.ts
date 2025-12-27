import { WalletProviderFactory, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider'
import { CoinbaseProviderConfig } from './types'

export const createCoinbaseWalletProvider = (
  coinbaseConfig: CoinbaseProviderConfig
): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) =>
    new CoinbaseWalletProvider(config, chain, coinbaseConfig)
}
