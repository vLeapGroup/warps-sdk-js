import { ChainAdapter, ChainAdapterFactory, WarpChainName, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { WarpEvmDataLoader } from '../WarpEvmDataLoader'
import { WarpEvmExecutor } from '../WarpEvmExecutor'
import { WarpEvmExplorer } from '../WarpEvmExplorer'
import { WarpEvmOutput } from '../WarpEvmOutput'
import { WarpEvmSerializer } from '../WarpEvmSerializer'
import { WarpEvmWallet } from '../WarpEvmWallet'

export const createEvmAdapter = (chainName: WarpChainName, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory => {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)

    return {
      chainInfo: chainInfos[config.env],
      builder: () => fallback.builder(),
      executor: new WarpEvmExecutor(config, chainInfos[config.env]),
      output: new WarpEvmOutput(config, chainInfos[config.env]),
      serializer: new WarpEvmSerializer(),
      registry: fallback.registry,
      explorer: new WarpEvmExplorer(chainInfos[config.env], config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
      dataLoader: new WarpEvmDataLoader(config, chainInfos[config.env]),
      wallet: new WarpEvmWallet(config, chainInfos[config.env]),
    }
  }
}
