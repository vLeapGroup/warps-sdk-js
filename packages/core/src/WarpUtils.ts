import { getMainChainInfo } from './helpers'
import { WarpAction, WarpChain, WarpChainInfo, WarpClientConfig } from './types'
import { CacheTtl } from './WarpCache'
import { WarpSerializer } from './WarpSerializer'

export class WarpUtils {
  static async getChainInfoForAction(config: WarpClientConfig, action: WarpAction, inputs?: string[]): Promise<WarpChainInfo> {
    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(config, action, inputs)
      if (chainFromInputs) return chainFromInputs
    }
    return this.getDefaultChainInfo(config, action)
  }

  private static async tryGetChainFromInputs(
    config: WarpClientConfig,
    action: WarpAction,
    inputs: string[]
  ): Promise<WarpChainInfo | null> {
    const chainPositionIndex = action.inputs?.findIndex((i) => i.position === 'chain')
    if (chainPositionIndex === -1 || chainPositionIndex === undefined) return null

    const chainInput = inputs[chainPositionIndex]
    if (!chainInput) throw new Error('WarpUtils: Chain input not found')

    const serializer = new WarpSerializer()
    const chainValue = serializer.stringToNative(chainInput)[1] as WarpChain

    const chainInfo = await config.repository.registry.getChainInfo(chainValue)
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${chainValue}`)

    return chainInfo
  }

  private static async getDefaultChainInfo(config: WarpClientConfig, action: WarpAction): Promise<WarpChainInfo> {
    if (!action.chain) return getMainChainInfo(config)

    const chainInfo = await config.repository.registry.getChainInfo(action.chain, { ttl: CacheTtl.OneWeek })
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${action.chain}`)

    return chainInfo
  }
}
