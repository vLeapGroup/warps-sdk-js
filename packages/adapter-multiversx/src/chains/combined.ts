import { Adapter, WarpChain, WarpClientConfig } from '@vleap/warps'
import { ChainNameMultiversx, getMultiversxAdapter } from './multiversx'
import { ChainNameVibechain, getVibechainAdapter } from './vibechain'

export const getAllMultiversxAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getMultiversxAdapter(config, fallback),
  getVibechainAdapter(config, fallback),
]

export const getAllMultiversxChainNames = (): WarpChain[] => [ChainNameMultiversx, ChainNameVibechain]
