import { ChainAdapterFactory } from '@vleap/warps'
import { MultiversxAdapter } from './chains/multiversx'
import { VibechainAdapter } from './chains/vibechain'

export const getAllMultiversxAdapters = (): ChainAdapterFactory[] => [MultiversxAdapter, VibechainAdapter]
