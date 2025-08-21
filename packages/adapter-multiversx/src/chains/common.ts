import { Adapter, AdapterFactory, WarpChainEnv, WarpChainInfo, WarpClientConfig, WarpTypeRegistry } from '@vleap/warps'
import { WarpMultiversxAbiBuilder } from '../WarpMultiversxAbiBuilder'
import { WarpMultiversxBrandBuilder } from '../WarpMultiversxBrandBuilder'
import { WarpMultiversxBuilder } from '../WarpMultiversxBuilder'
import { WarpMultiversxDataLoader } from '../WarpMultiversxDataLoader'
import { WarpMultiversxExecutor } from '../WarpMultiversxExecutor'
import { WarpMultiversxExplorer } from '../WarpMultiversxExplorer'
import { WarpMultiversxRegistry } from '../WarpMultiversxRegistry'
import { WarpMultiversxResults } from '../WarpMultiversxResults'
import { WarpMultiversxSerializer } from '../WarpMultiversxSerializer'

export const createMultiversxAdapter = (
  chainName: string,
  chainPrefix: string,
  chainInfos: Record<WarpChainEnv, WarpChainInfo>
): AdapterFactory => {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    const chainInfo = chainInfos[config.env]
    return {
      chain: chainName,
      chainInfo,
      prefix: chainPrefix,
      builder: () => new WarpMultiversxBuilder(config, chainInfo),
      executor: new WarpMultiversxExecutor(config, chainInfo),
      results: new WarpMultiversxResults(config, chainInfo),
      serializer: new WarpMultiversxSerializer(),
      registry: new WarpMultiversxRegistry(config, chainInfo),
      explorer: new WarpMultiversxExplorer(chainName, config),
      abiBuilder: () => new WarpMultiversxAbiBuilder(config, chainInfo),
      brandBuilder: () => new WarpMultiversxBrandBuilder(config, chainInfo),
      dataLoader: new WarpMultiversxDataLoader(config, chainInfo),
      registerTypes: (typeRegistry: WarpTypeRegistry) => {
        // Register MultiversX-specific types
        typeRegistry.registerType('token', {
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `token:${value}`,
        })

        typeRegistry.registerType('codemeta', {
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `codemeta:${value}`,
        })
      },
    }
  }
}
