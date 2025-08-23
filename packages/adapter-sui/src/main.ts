import { Adapter, AdapterFactory, WarpChainAsset, WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'
import { WarpSuiBrandBuilder } from './WarpSuiBrandBuilder'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiDataLoader } from './WarpSuiDataLoader'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiExplorer } from './WarpSuiExplorer'
import { WarpSuiRegistry } from './WarpSuiRegistry'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export const NativeTokenSui: WarpChainAsset = {
  identifier: '0x2::sui::SUI',
  name: 'SUI',
  decimals: 9,
  logoUrl: 'https://vleap.ai/images/tokens/sui.svg',
}

function createSuiAdapter(chainName: string, chainPrefix: string, chainInfos: Record<WarpChainEnv, WarpChainInfo>): AdapterFactory {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    const chainInfo = chainInfos[config.env]
    if (!chainInfo) throw new Error(`SuiAdapter: chain info not found for chain ${chainName}`)

    return {
      chain: chainName,
      chainInfo,
      prefix: chainPrefix,
      builder: () => new WarpSuiBuilder(config, chainInfo),
      executor: new WarpSuiExecutor(config, chainInfo),
      results: new WarpSuiResults(config, chainInfo),
      serializer: new WarpSuiSerializer(),
      registry: new WarpSuiRegistry(config, chainInfo),
      explorer: new WarpSuiExplorer(config, chainInfo),
      abiBuilder: () => new WarpSuiAbiBuilder(config, chainInfo),
      brandBuilder: () => new WarpSuiBrandBuilder(config, chainInfo),
      dataLoader: new WarpSuiDataLoader(config, chainInfo),
    }
  }
}

export const getSuiAdapter: AdapterFactory = createSuiAdapter(WarpChainName.Sui, 'sui', {
  mainnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui',
    chainId: '1',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.mainnet.sui.io',
    nativeToken: NativeTokenSui,
  },
  testnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui Testnet',
    chainId: 'testnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.testnet.sui.io',
    nativeToken: NativeTokenSui,
  },
  devnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    nativeToken: NativeTokenSui,
  },
})
