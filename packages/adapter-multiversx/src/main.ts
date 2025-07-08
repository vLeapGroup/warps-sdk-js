import { Adapter } from '@vleap/warps-core'
import { WarpMultiversxBuilder } from './WarpMultiversxBuilder'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { WarpMultiversxRegistry } from './WarpMultiversxRegistry'
import { WarpMultiversxResults } from './WarpMultiversxResults'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export const getMultiversxAdapter = (): Adapter => {
  return {
    chain: 'multiversx',
    builder: WarpMultiversxBuilder,
    executor: WarpMultiversxExecutor,
    results: WarpMultiversxResults,
    serializer: WarpMultiversxSerializer,
    registry: WarpMultiversxRegistry,
  }
}
