import { Adapter, AdapterFactory, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpEvmBuilder } from '../WarpEvmBuilder'
import { WarpEvmExecutor } from '../WarpEvmExecutor'
import { WarpEvmExplorer } from '../WarpEvmExplorer'
import { WarpEvmResults } from '../WarpEvmResults'
import { WarpEvmSerializer } from '../WarpEvmSerializer'

export const createEvmAdapter = (
  chainName: string,
  chainPrefix: string,
  chainInfos: Record<WarpChainEnv, WarpChainInfo>
): AdapterFactory => {
  return (config: WarpClientConfig, fallback?: Adapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)

    return {
      chain: chainName,
      chainInfo: chainInfos[config.env],
      prefix: chainPrefix,
      builder: () => new WarpEvmBuilder(config),
      executor: new WarpEvmExecutor(config),
      results: new WarpEvmResults(config),
      serializer: new WarpEvmSerializer(),
      registry: fallback.registry,
      explorer: new WarpEvmExplorer(chainInfos[config.env], config),
      abiBuilder: () => fallback.abiBuilder(),
      brandBuilder: () => fallback.brandBuilder(),
    }
  }
}
