import { Adapter, WarpClientConfig } from '@vleap/warps'
import { WarpChainInfo } from '@vleap/warps/src/types'
import { WarpEvmAbiBuilder } from './WarpEvmAbiBuilder'
import { WarpEvmBrandBuilder } from './WarpEvmBrandBuilder'
import { WarpEvmBuilder } from './WarpEvmBuilder'
import { WarpEvmExecutor } from './WarpEvmExecutor'
import { WarpEvmExplorer } from './WarpEvmExplorer'
import { WarpEvmRegistry } from './WarpEvmRegistry'
import { WarpEvmResults } from './WarpEvmResults'
import { WarpEvmSerializer } from './WarpEvmSerializer'
import { WarpEvmConstants } from './constants'

export const getEvmAdapter = (config: WarpClientConfig, chainName: string = 'ethereum'): Adapter => {
  return {
    chain: WarpEvmConstants.ChainName,
    prefix: WarpEvmConstants.ChainPrefix,
    builder: () => new WarpEvmBuilder(config),
    executor: new WarpEvmExecutor(config, chainName),
    results: new WarpEvmResults(config),
    serializer: new WarpEvmSerializer(),
    registry: new WarpEvmRegistry(config, chainName),
    explorer: (chainInfo: WarpChainInfo) => new WarpEvmExplorer(chainInfo, chainName),
    abiBuilder: () => new WarpEvmAbiBuilder(config),
    brandBuilder: () => new WarpEvmBrandBuilder(config),
  }
}

// Convenience functions for specific chains
export const getEthereumAdapter = (config: WarpClientConfig): Adapter => {
  return getEvmAdapter(config, 'ethereum')
}

export const getArbitrumAdapter = (config: WarpClientConfig): Adapter => {
  return getEvmAdapter(config, 'arbitrum')
}

export const getBaseAdapter = (config: WarpClientConfig): Adapter => {
  return getEvmAdapter(config, 'base')
}
