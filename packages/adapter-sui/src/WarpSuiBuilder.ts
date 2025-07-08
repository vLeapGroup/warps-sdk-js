import { AdapterWarpBuilder, Warp, WarpCache, WarpCacheConfig, WarpInitConfig } from '@vleap/warps-core'

export class WarpSuiBuilder implements AdapterWarpBuilder {
  private config: WarpInitConfig
  private cache: WarpCache

  constructor(config: WarpInitConfig) {
    this.config = config
    this.cache = new WarpCache(config.cache?.type)
  }

  createInscriptionTransaction(warp: Warp): any {
    // TODO: Implement Sui-specific inscription transaction
    throw new Error('Not implemented')
  }

  async createFromTransaction(tx: any, validate = false): Promise<Warp> {
    // TODO: Implement Sui-specific create from transaction
    throw new Error('Not implemented')
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    // TODO: Implement Sui-specific create from transaction hash
    throw new Error('Not implemented')
  }
}
