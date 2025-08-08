import { Adapter, AdapterFactory, WarpClientConfig } from '@vleap/warps'
import { WarpChainInfo } from '@vleap/warps/src/types'
import { WarpEvmBuilder } from './WarpEvmBuilder'
import { WarpEvmExecutor } from './WarpEvmExecutor'
import { WarpEvmExplorer } from './WarpEvmExplorer'
import { WarpEvmResults } from './WarpEvmResults'
import { WarpEvmSerializer } from './WarpEvmSerializer'
import { WarpEvmConstants } from './constants'

export const getEvmAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('EVM adapter requires a fallback adapter')

  return {
    chain: WarpEvmConstants.ChainName,
    prefix: WarpEvmConstants.ChainPrefix,
    builder: () => new WarpEvmBuilder(config),
    executor: new WarpEvmExecutor(config),
    results: new WarpEvmResults(config),
    serializer: new WarpEvmSerializer(),
    registry: fallback.registry,
    explorer: (chainInfo: WarpChainInfo) => new WarpEvmExplorer(chainInfo),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
  }
}
