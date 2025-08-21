import { Adapter, AdapterFactory, WarpChain, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

const ChainName: WarpChain = 'fastset'

export const getFastsetAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

  const chainInfo: WarpChainInfo = {
    name: ChainName,
    displayName: 'FastSet',
    chainId: '1',
    blockTime: 100,
    addressHrp: 'set',
    defaultApiUrl: 'TODO',
    nativeToken: 'SET',
  }

  return {
    chain: ChainName,
    chainInfo,
    prefix: 'fastset',
    builder: () => fallback.builder(),
    executor: new WarpFastsetExecutor(config, chainInfo),
    results: new WarpFastsetResults(config),
    serializer: new WarpFastsetSerializer(),
    registry: fallback.registry,
    explorer: new WarpFastsetExplorer(chainInfo),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
    dataLoader: new WarpFastsetDataLoader(config, chainInfo),
  }
}
