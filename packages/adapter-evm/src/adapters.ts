import { ChainAdapterFactory, withAdapterFallback } from '@vleap/warps'
import { ArbitrumAdapter } from './chains/arbitrum'
import { BaseAdapter } from './chains/base'
import { EthereumAdapter } from './chains/ethereum'
import { SomniaAdapter } from './chains/somnia'

export const getAllEvmAdapters = (fallbackFactory: ChainAdapterFactory): ChainAdapterFactory[] => [
  withAdapterFallback(EthereumAdapter, fallbackFactory),
  withAdapterFallback(BaseAdapter, fallbackFactory),
  withAdapterFallback(ArbitrumAdapter, fallbackFactory),
  withAdapterFallback(SomniaAdapter, fallbackFactory),
]
