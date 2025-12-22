import { ChainAdapterFactory, withAdapter } from '@vleap/warps'
import { ArbitrumAdapter } from './chains/arbitrum'
import { BaseAdapter } from './chains/base'
import { EthereumAdapter } from './chains/ethereum'
import { SomniaAdapter } from './chains/somnia'

export const getAllEvmAdapters = (fallbackFactory: ChainAdapterFactory): ChainAdapterFactory[] => [
  withAdapter(EthereumAdapter, fallbackFactory),
  withAdapter(BaseAdapter, fallbackFactory),
  withAdapter(ArbitrumAdapter, fallbackFactory),
  withAdapter(SomniaAdapter, fallbackFactory),
]
