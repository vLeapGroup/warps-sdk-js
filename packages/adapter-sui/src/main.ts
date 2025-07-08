import { Adapter } from '@vleap/warps-core'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiRegistry } from './WarpSuiRegistry'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export const getSuiAdapter = (): Adapter => {
  return {
    chain: 'sui',
    builder: WarpSuiBuilder,
    executor: WarpSuiExecutor,
    results: WarpSuiResults,
    serializer: WarpSuiSerializer,
    registry: WarpSuiRegistry,
  }
}
