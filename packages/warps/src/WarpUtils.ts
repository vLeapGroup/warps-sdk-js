import { WarpMultiversxRegistry } from '@vleap/warps-adapter-multiversx'
import { getMainChainInfo } from '@vleap/warps-core/dist/helpers/general'
import { CacheTtl } from '@vleap/warps-core/dist/WarpCache'
import { WarpSerializer } from '@vleap/warps-core/dist/WarpSerializer'
import { WarpAction, WarpChain, WarpChainInfo, WarpInitConfig } from './types/index'

export class WarpUtils {
  static async getChainInfoForAction(config: WarpInitConfig, action: WarpAction, inputs?: string[]): Promise<WarpChainInfo> {
    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(config, action, inputs)
      if (chainFromInputs) return chainFromInputs
    }
    return this.getDefaultChainInfo(config, action)
  }

  private static async tryGetChainFromInputs(config: WarpInitConfig, action: WarpAction, inputs: string[]): Promise<WarpChainInfo | null> {
    const chainPositionIndex = action.inputs?.findIndex((i) => i.position === 'chain')
    if (chainPositionIndex === -1 || chainPositionIndex === undefined) return null

    const chainInput = inputs[chainPositionIndex]
    if (!chainInput) throw new Error('WarpUtils: Chain input not found')

    const serializer = new WarpSerializer()
    const chainValue = serializer.stringToNative(chainInput)[1] as WarpChain

    const registry = new WarpMultiversxRegistry(config)
    const chainInfo = await registry.getChainInfo(chainValue)
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${chainValue}`)

    return chainInfo
  }

  private static async getDefaultChainInfo(config: WarpInitConfig, action: WarpAction): Promise<WarpChainInfo> {
    if (!action.chain) return getMainChainInfo(config)

    const registry = new WarpMultiversxRegistry(config)
    const chainInfo = await registry.getChainInfo(action.chain, { ttl: CacheTtl.OneWeek })
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${action.chain}`)

    return chainInfo
  }
}
