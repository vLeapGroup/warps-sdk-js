import { Adapter, AdapterFactory, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'
import { WarpSuiBrandBuilder } from './WarpSuiBrandBuilder'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiExplorer } from './WarpSuiExplorer'
import { WarpSuiRegistry } from './WarpSuiRegistry'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

function createSuiAdapter(chainName: string, chainPrefix: string, chainInfos: Record<WarpChainEnv, WarpChainInfo>): AdapterFactory {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    const chainInfo = chainInfos[config.env]
    if (!chainInfo) throw new Error(`SuiAdapter: chain info not found for chain ${chainName}`)

    return {
      chain: chainName,
      chainInfo,
      prefix: chainPrefix,
      builder: () => new WarpSuiBuilder(config, chainName),
      executor: new WarpSuiExecutor(config, chainName),
      results: new WarpSuiResults(config, chainName),
      serializer: new WarpSuiSerializer(),
      registry: new WarpSuiRegistry(config, chainName),
      explorer: new WarpSuiExplorer(config, chainName),
      abiBuilder: () => new WarpSuiAbiBuilder(config),
      brandBuilder: () => new WarpSuiBrandBuilder(config),
    }
  }
}

export const getSuiAdapter: AdapterFactory = createSuiAdapter('sui', 'sui', {
  mainnet: {
    displayName: 'Sui',
    chainId: '1',
    blockTime: 3000,
    addressHrp: 'sui',
    apiUrl: 'https://fullnode.mainnet.sui.io',
    nativeToken: 'SUI',
  },
  testnet: {
    displayName: 'Sui Testnet',
    chainId: 'testnet',
    blockTime: 3000,
    addressHrp: 'sui',
    apiUrl: 'https://fullnode.testnet.sui.io',
    nativeToken: 'SUI',
  },
  devnet: {
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    apiUrl: 'https://fullnode.devnet.sui.io',
    nativeToken: 'SUI',
  },
})
