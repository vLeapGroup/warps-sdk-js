import { Adapter, AdapterFactory, WarpChainAsset, WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetResults } from './WarpFastsetResults'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export const NativeTokenSet: WarpChainAsset = {
  chain: WarpChainName.Fastset,
  identifier: 'SET',
  name: 'SET',
  decimals: 6,
  logoUrl: 'https://vleap.ai/images/tokens/set.svg',
}

function createFastsetAdapter(chainName: string, chainPrefix: string, chainInfos: Record<WarpChainEnv, WarpChainInfo>): AdapterFactory {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    const chainInfo = chainInfos[config.env]
    if (!chainInfo) throw new Error(`FastsetAdapter: chain info not found for chain ${chainName}`)

    if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

    return {
      chain: chainName,
      chainInfo,
      prefix: chainPrefix,
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
}

export const getFastsetAdapter: AdapterFactory = createFastsetAdapter(WarpChainName.Fastset, 'fastset', {
  mainnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: '1',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    nativeToken: NativeTokenSet,
  },
  testnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet Testnet',
    chainId: 'testnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    nativeToken: NativeTokenSet,
  },
  devnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet Devnet',
    chainId: 'devnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    nativeToken: NativeTokenSet,
  },
})
