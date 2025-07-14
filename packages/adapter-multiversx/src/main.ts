import { Adapter, WarpClientConfig } from '@vleap/warps'
import { WarpChainInfo } from '@vleap/warps/src/types'
import { WarpMultiversxBuilder } from './WarpMultiversxBuilder'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { WarpMultiversxExplorer } from './WarpMultiversxExplorer'
import { WarpMultiversxRegistry } from './WarpMultiversxRegistry'
import { WarpMultiversxResults } from './WarpMultiversxResults'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export const getMultiversxAdapter = (config: WarpClientConfig): Adapter => {
  return {
    chain: 'multiversx',
    prefix: 'mvx',
    builder: new WarpMultiversxBuilder(config),
    executor: new WarpMultiversxExecutor(config),
    results: new WarpMultiversxResults(config),
    serializer: new WarpMultiversxSerializer(),
    registry: new WarpMultiversxRegistry(config),
    explorer: (chainInfo: WarpChainInfo) => new WarpMultiversxExplorer(chainInfo),
  }
}
