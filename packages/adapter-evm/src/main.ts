import { Adapter, AdapterFactory, WarpClientConfig } from '@vleap/warps'
import { WarpChainInfo } from '@vleap/warps/src/types'
import { WarpEvmBuilder } from './WarpEvmBuilder'
import { WarpEvmExecutor } from './WarpEvmExecutor'
import { WarpEvmExplorer } from './WarpEvmExplorer'
import { WarpEvmResults } from './WarpEvmResults'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export const getEthereumAdapter: AdapterFactory = createEvmAdapter('ethereum', 'eth')
export const getArbitrumAdapter: AdapterFactory = createEvmAdapter('arbitrum', 'arb')
export const getBaseAdapter: AdapterFactory = createEvmAdapter('base', 'base')

export const getAllEvmAdapters = (config: WarpClientConfig, fallback?: Adapter): Adapter[] => [
  getEthereumAdapter(config, fallback),
  getArbitrumAdapter(config, fallback),
  getBaseAdapter(config, fallback),
]

function createEvmAdapter(chainName: string, chainPrefix: string): AdapterFactory {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)

    return {
      chain: chainName,
      prefix: chainPrefix,
      builder: () => new WarpEvmBuilder(config),
      executor: new WarpEvmExecutor(config),
      results: new WarpEvmResults(config),
      serializer: new WarpEvmSerializer(),
      registry: fallback.registry,
      explorer: (chainInfo: WarpChainInfo) => new WarpEvmExplorer(chainInfo, config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
    }
  }
}
