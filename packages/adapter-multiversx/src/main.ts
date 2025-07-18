import { Adapter, WarpClientConfig } from '@vleap/warps'
import { WarpChainInfo } from '@vleap/warps/src/types'
import { WarpMultiversxAbiBuilder } from './WarpMultiversxAbiBuilder'
import { WarpMultiversxBrandBuilder } from './WarpMultiversxBrandBuilder'
import { WarpMultiversxBuilder } from './WarpMultiversxBuilder'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { WarpMultiversxExplorer } from './WarpMultiversxExplorer'
import { WarpMultiversxRegistry } from './WarpMultiversxRegistry'
import { WarpMultiversxResults } from './WarpMultiversxResults'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'
import { WarpMultiversxConstants } from './constants'

export const getMultiversxAdapter = (config: WarpClientConfig): Adapter => {
  return {
    chain: WarpMultiversxConstants.ChainName,
    prefix: WarpMultiversxConstants.ChainPrefix,
    builder: () => new WarpMultiversxBuilder(config),
    executor: new WarpMultiversxExecutor(config),
    results: new WarpMultiversxResults(config),
    serializer: new WarpMultiversxSerializer(),
    registry: new WarpMultiversxRegistry(config),
    explorer: (chainInfo: WarpChainInfo) => new WarpMultiversxExplorer(chainInfo),
    abiBuilder: () => new WarpMultiversxAbiBuilder(config),
    brandBuilder: () => new WarpMultiversxBrandBuilder(config),
  }
}
