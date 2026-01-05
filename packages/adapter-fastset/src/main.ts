import {
  ChainAdapter,
  ChainAdapterFactory,
  WarpChainAsset,
  WarpChainEnv,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
} from '@vleap/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'
import { WarpFastsetExecutor } from './WarpFastsetExecutor'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'
import { WarpFastsetOutput } from './WarpFastsetOutput'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'
import { WarpFastsetWallet } from './WarpFastsetWallet'

export const NativeTokenSet: WarpChainAsset = {
  chain: WarpChainName.Fastset,
  identifier: 'SET',
  name: 'SET',
  symbol: 'SET',
  decimals: 0,
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/set-black.svg',
}

function createFastsetAdapter(chainName: WarpChainName, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    const chainInfo = chainInfos[config.env]
    if (!chainInfo) throw new Error(`FastsetAdapter: chain info not found for chain ${chainName}`)
    if (!fallback) throw new Error('Fastset adapter requires a fallback adapter')

    return {
      chainInfo,
      builder: () => fallback.builder(),
      executor: new WarpFastsetExecutor(config, chainInfo),
      output: new WarpFastsetOutput(config, chainInfo),
      serializer: new WarpFastsetSerializer(),
      registry: fallback.registry,
      explorer: new WarpFastsetExplorer(chainInfo, config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
      dataLoader: new WarpFastsetDataLoader(config, chainInfo),
      wallet: new WarpFastsetWallet(config, chainInfo),
    }
  }
}

export const FastsetAdapter: ChainAdapterFactory = createFastsetAdapter(WarpChainName.Fastset, {
  mainnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: '1',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://proxy.fastset.xyz',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/fastset-black.svg',
    nativeToken: NativeTokenSet,
  },
  testnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet Testnet',
    chainId: 'testnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://proxy.fastset.xyz',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/fastset-black.svg',
    nativeToken: NativeTokenSet,
  },
  devnet: {
    name: WarpChainName.Fastset,
    displayName: 'FastSet Devnet',
    chainId: 'devnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://proxy.fastset.xyz',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/fastset-black.svg',
    nativeToken: NativeTokenSet,
  },
})
