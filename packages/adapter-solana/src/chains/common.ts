import { ChainAdapter, ChainAdapterFactory, WarpChainName, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpSolanaDataLoader } from '../WarpSolanaDataLoader'
import { WarpSolanaExecutor } from '../WarpSolanaExecutor'
import { WarpSolanaExplorer } from '../WarpSolanaExplorer'
import { WarpSolanaOutput } from '../WarpSolanaOutput'
import { WarpSolanaSerializer } from '../WarpSolanaSerializer'
import { WarpSolanaWallet } from '../WarpSolanaWallet'

export const createSolanaAdapter = (chainName: WarpChainName, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory => {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)

    return {
      chainInfo: chainInfos[config.env],
      builder: () => fallback.builder(),
      executor: new WarpSolanaExecutor(config, chainInfos[config.env]),
      output: new WarpSolanaOutput(config, chainInfos[config.env]),
      serializer: new WarpSolanaSerializer(),
      registry: fallback.registry,
      explorer: new WarpSolanaExplorer(chainInfos[config.env], config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
      dataLoader: new WarpSolanaDataLoader(config, chainInfos[config.env]),
      wallet: new WarpSolanaWallet(config, chainInfos[config.env]),
    }
  }
}
