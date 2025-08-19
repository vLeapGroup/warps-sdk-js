import { Adapter, WarpChain, WarpClientConfig } from '@vleap/warps'
import { ChainNameArbitrum, getArbitrumAdapter } from './arbitrum'
import { ChainNameBase, getBaseAdapter } from './base'
import { ChainNameEthereum, getEthereumAdapter } from './ethereum'

export const getAllEvmAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getEthereumAdapter(config, fallback),
  getArbitrumAdapter(config, fallback),
  getBaseAdapter(config, fallback),
]

export const getAllEvmChainNames = (): WarpChain[] => [ChainNameArbitrum, ChainNameBase, ChainNameEthereum]
