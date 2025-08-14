import { Adapter, WarpClientConfig } from '@vleap/warps'
import { getArbitrumAdapter } from './arbitrum'
import { getBaseAdapter } from './base'
import { getEthereumAdapter } from './ethereum'

export const getAllEvmAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getEthereumAdapter(config, fallback),
  getArbitrumAdapter(config, fallback),
  getBaseAdapter(config, fallback),
]
