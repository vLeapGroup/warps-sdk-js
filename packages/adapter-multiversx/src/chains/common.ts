import { ChainAdapter, ChainAdapterFactory, WarpChainName, WarpChainEnv, WarpChainInfo, WarpClientConfig, WarpTypeRegistry } from '@joai/warps'
import { WarpMultiversxAbiBuilder } from '../WarpMultiversxAbiBuilder'
import { WarpMultiversxBrandBuilder } from '../WarpMultiversxBrandBuilder'
import { WarpMultiversxBuilder } from '../WarpMultiversxBuilder'
import { WarpMultiversxDataLoader } from '../WarpMultiversxDataLoader'
import { WarpMultiversxExecutor } from '../WarpMultiversxExecutor'
import { WarpMultiversxExplorer } from '../WarpMultiversxExplorer'
import { WarpMultiversxRegistry } from '../WarpMultiversxRegistry'
import { WarpMultiversxOutput } from '../WarpMultiversxOutput'
import { WarpMultiversxSerializer } from '../WarpMultiversxSerializer'
import { WarpMultiversxWallet } from '../WarpMultiversxWallet'

export const createMultiversxAdapter = (chainName: WarpChainName, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory => {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    const chainInfo = chainInfos[config.env]

    const typeRegistry = new WarpTypeRegistry()
    typeRegistry.registerType('token', {
      stringToNative: (value: string) => value,
      nativeToString: (value: any) => `token:${value}`,
    })
    typeRegistry.registerType('codemeta', {
      stringToNative: (value: string) => value,
      nativeToString: (value: any) => `codemeta:${value}`,
    })
    typeRegistry.registerTypeAlias('list', 'vector')

    return {
      chainInfo,
      builder: () => new WarpMultiversxBuilder(config, chainInfo),
      executor: new WarpMultiversxExecutor(config, chainInfo, typeRegistry),
      output: new WarpMultiversxOutput(config, chainInfo, typeRegistry),
      serializer: new WarpMultiversxSerializer({ typeRegistry }),
      registry: new WarpMultiversxRegistry(config, chainInfo),
      explorer: new WarpMultiversxExplorer(chainName, config),
      abiBuilder: () => new WarpMultiversxAbiBuilder(config, chainInfo),
      brandBuilder: () => new WarpMultiversxBrandBuilder(config, chainInfo),
      dataLoader: new WarpMultiversxDataLoader(config, chainInfo),
      wallet: new WarpMultiversxWallet(config, chainInfo),
    }
  }
}
