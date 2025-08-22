import { Adapter, AdapterFactory, WarpChain, WarpChainAsset, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

const ChainName: WarpChain = 'fastset'

export const NativeTokenSet: WarpChainAsset = {
  identifier: 'SET',
  name: 'SET',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/set.svg',
}

const ChainInfo: WarpChainInfo = {
  name: ChainName,
  displayName: 'FastSet',
  chainId: '1',
  blockTime: 100,
  addressHrp: 'set',
  defaultApiUrl: 'TODO',
  nativeToken: NativeTokenSet,
}

export const getFastsetAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

  return {
    chain: ChainName,
    chainInfo: ChainInfo,
    prefix: 'fastset',
    builder: () => fallback.builder(),
    executor: new WarpFastsetExecutor(config, ChainInfo),
    results: new WarpFastsetResults(config),
    serializer: new WarpFastsetSerializer(),
    registry: fallback.registry,
    explorer: new WarpFastsetExplorer(ChainInfo),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
    dataLoader: new WarpFastsetDataLoader(config, ChainInfo),
  }
}
