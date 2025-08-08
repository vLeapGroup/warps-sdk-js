import { Adapter, AdapterFactory, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetConstants } from './constants'
import { WarpFastsetBuilder } from './WarpFastsetBuilder'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export const getFastsetAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

  return {
    chain: WarpFastsetConstants.ChainName,
    prefix: WarpFastsetConstants.ChainPrefix,
    builder: () => new WarpFastsetBuilder(config),
    executor: new WarpFastsetExecutor(config),
    results: new WarpFastsetResults(config),
    serializer: new WarpFastsetSerializer(),
    registry: fallback.registry,
    explorer: (chainInfo) => new WarpFastsetExplorer(chainInfo),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
  }
}
