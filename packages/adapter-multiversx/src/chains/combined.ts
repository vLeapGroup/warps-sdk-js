import { Adapter, WarpChain, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { getMultiversxAdapter } from './multiversx'
import { getVibechainAdapter } from './vibechain'

export const getAllMultiversxAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getMultiversxAdapter(config, fallback),
  getVibechainAdapter(config, fallback),
]

export const getAllMultiversxChainNames = (): WarpChain[] => [WarpChainName.Multiversx, WarpChainName.Vibechain]
