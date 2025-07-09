import { Adapter, WarpInitConfig } from '@vleap/warps'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiRegistry } from './WarpSuiRegistry'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export const getSuiAdapter = (config: WarpInitConfig): Adapter => {
  return {
    chain: 'sui',
    builder: new WarpSuiBuilder(config),
    executor: new WarpSuiExecutor(config),
    results: new WarpSuiResults(config),
    serializer: new WarpSuiSerializer(),
    registry: new WarpSuiRegistry(config),
  }
}
