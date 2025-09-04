import { Adapter, WarpChain, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { getArbitrumAdapter } from './arbitrum'
import { getBaseAdapter } from './base'
import { getEthereumAdapter } from './ethereum'
import { getSomniaAdapter } from './somnia'

export const getAllEvmAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getEthereumAdapter(config, fallback),
  getBaseAdapter(config, fallback),
  getArbitrumAdapter(config, fallback),
  getSomniaAdapter(config, fallback),
]

export const getAllEvmChainNames = (): WarpChain[] => [
  WarpChainName.Ethereum,
  WarpChainName.Base,
  WarpChainName.Arbitrum,
  WarpChainName.Somnia,
]
