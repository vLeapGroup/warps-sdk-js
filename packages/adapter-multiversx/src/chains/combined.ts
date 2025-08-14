import { Adapter, WarpClientConfig } from '@vleap/warps'
import { getMultiversxAdapter } from './multiversx'
import { getVibechainAdapter } from './vibechain'

export const getAllMultiversxAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getMultiversxAdapter(config, fallback),
  getVibechainAdapter(config, fallback),
]
