import { Adapter, AdapterFactory, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpMultiversxAbiBuilder } from '../WarpMultiversxAbiBuilder'
import { WarpMultiversxBrandBuilder } from '../WarpMultiversxBrandBuilder'
import { WarpMultiversxBuilder } from '../WarpMultiversxBuilder'
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
      builder: () => new WarpMultiversxBuilder(config, chainName),
      executor: new WarpMultiversxExecutor(config, chainName),
      results: new WarpMultiversxResults(config),
      serializer: new WarpMultiversxSerializer(),
      registry: new WarpMultiversxRegistry(config),
      explorer: new WarpMultiversxExplorer(chainName, config),
      abiBuilder: () => new WarpMultiversxAbiBuilder(config, chainName),
      brandBuilder: () => new WarpMultiversxBrandBuilder(config, chainName),
    }
  }
}
