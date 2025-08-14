import { Adapter, AdapterFactory, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetBuilder } from './WarpFastsetBuilder'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export const getFastsetAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

  const chainInfo: WarpChainInfo = {
    displayName: 'FastSet',
    chainId: '1',
    blockTime: 100,
    addressHrp: 'set',
    apiUrl: 'TODO',
    nativeToken: 'SET',
  }

  return {
    chain: 'fastset',
    chainInfo,
    prefix: 'fastset',
    builder: () => new WarpFastsetBuilder(config),
    executor: new WarpFastsetExecutor(config),
    results: new WarpFastsetResults(config),
    serializer: new WarpFastsetSerializer(),
    registry: fallback.registry,
    explorer: new WarpFastsetExplorer(chainInfo),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
  }
}
