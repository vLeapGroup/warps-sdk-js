import { Adapter, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'
import { WarpSuiBrandBuilder } from './WarpSuiBrandBuilder'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiExplorer } from './WarpSuiExplorer'
import { WarpSuiRegistry } from './WarpSuiRegistry'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'
import { WarpSuiConstants } from './constants'

export const getSuiAdapter = (config: WarpClientConfig): Adapter => {
  return {
    chain: WarpSuiConstants.ChainName,
    prefix: 'sui',
    builder: () => new WarpSuiBuilder(config),
    executor: new WarpSuiExecutor(config),
    results: new WarpSuiResults(config),
    serializer: new WarpSuiSerializer(),
    registry: new WarpSuiRegistry(config),
    explorer: (chainInfo: WarpChainInfo) => new WarpSuiExplorer(chainInfo),
    abiBuilder: () => new WarpSuiAbiBuilder(config),
    brandBuilder: () => new WarpSuiBrandBuilder(config),
  }
}
