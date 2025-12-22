import { ChainAdapter, ChainAdapterFactory, WarpChain, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpNearDataLoader } from '../WarpNearDataLoader'
import { WarpNearExecutor } from '../WarpNearExecutor'
import { WarpNearExplorer } from '../WarpNearExplorer'
import { WarpNearOutput } from '../WarpNearOutput'
import { WarpNearSerializer } from '../WarpNearSerializer'
import { WarpNearWallet } from '../WarpNearWallet'

export const createNearAdapter = (chainName: WarpChain, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory => {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)

    return {
      chainInfo: chainInfos[config.env],
      builder: () => fallback.builder(),
      executor: new WarpNearExecutor(config, chainInfos[config.env]),
      output: new WarpNearOutput(config, chainInfos[config.env]),
      serializer: new WarpNearSerializer(),
      registry: fallback.registry,
      explorer: new WarpNearExplorer(chainInfos[config.env], config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
      dataLoader: new WarpNearDataLoader(config, chainInfos[config.env]),
      wallet: new WarpNearWallet(config, chainInfos[config.env]),
    }
  }
}
