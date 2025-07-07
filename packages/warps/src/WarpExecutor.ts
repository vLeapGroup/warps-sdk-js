import { Warp, WarpInitConfig } from '@vleap/warps-core'
import { WarpActionIndex } from '@vleap/warps-core/src/types'
import { getAdapter } from '../config/adapter'
import { WarpFactory } from './WarpFactory'

export type WarpAdapterTransaction = any

export class WarpExecutor {
  private config: WarpInitConfig
  private factory: WarpFactory

  constructor(config: WarpInitConfig) {
    this.config = config
    this.factory = new WarpFactory(config)
  }

  async execute(warp: Warp, action: WarpActionIndex, inputs: string[]): Promise<WarpAdapterTransaction> {
    const executable = await this.factory.createExecutable(warp, action, inputs)
    const chainName = executable.chain.name.toLowerCase()
    const adapterLoader = getAdapter(chainName) || getAdapter('multiversx')
    if (!adapterLoader) throw new Error(`No adapter registered for chain: ${chainName}`)
    const AdapterExecutor = await adapterLoader()
    const executor = new AdapterExecutor(this.config)
    return await executor.execute(executable)
  }
}
