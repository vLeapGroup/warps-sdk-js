import { ChainAdapterFactory, withAdapterFallback } from '@joai/warps'
import { ArbitrumAdapter } from './chains/arbitrum'
import { BaseAdapter } from './chains/base'
import { EthereumAdapter } from './chains/ethereum'
import { PolygonAdapter } from './chains/polygon'
import { SomniaAdapter } from './chains/somnia'

export const getAllEvmAdapters = (fallbackFactory: ChainAdapterFactory): ChainAdapterFactory[] => [
  withAdapterFallback(EthereumAdapter, fallbackFactory),
  withAdapterFallback(BaseAdapter, fallbackFactory),
  withAdapterFallback(ArbitrumAdapter, fallbackFactory),
  withAdapterFallback(PolygonAdapter, fallbackFactory),
  withAdapterFallback(SomniaAdapter, fallbackFactory),
]
