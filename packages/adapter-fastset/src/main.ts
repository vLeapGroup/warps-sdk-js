import { Adapter, AdapterFactory, WarpChainAsset, WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { getFastsetChainConfig } from './config'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export const NativeTokenSet: WarpChainAsset = {
  identifier: 'SET',
  name: 'SET',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/set.svg',
}

const createChainInfo = (env: WarpChainEnv): WarpChainInfo => {
  const config = getFastsetChainConfig(WarpChainName.Fastset, env)
  return {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: config.chainId,
    blockTime: config.blockTime || 12000,
    addressHrp: 'set',
    defaultApiUrl: config.defaultApiUrl,
    nativeToken: NativeTokenSet,
  }
}

export const getFastsetAdapter: AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => {
  if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

  const chainInfo = createChainInfo(config.env)

  return {
    chain: WarpChainName.Fastset,
    chainInfo,
    prefix: 'fastset',
    builder: () => fallback.builder(),
    executor: new WarpFastsetExecutor(config, chainInfo),
    results: new WarpFastsetResults(config, chainInfo),
    serializer: new WarpFastsetSerializer(),
    registry: fallback.registry,
    explorer: new WarpFastsetExplorer(chainInfo, config),
    abiBuilder: () => fallback.abiBuilder(),
    brandBuilder: () => fallback.brandBuilder(),
    dataLoader: new WarpFastsetDataLoader(config, chainInfo),
  }
}
