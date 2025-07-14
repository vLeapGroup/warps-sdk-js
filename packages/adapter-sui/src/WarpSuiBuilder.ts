import { AdapterWarpBuilder, Warp, WarpCache, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'

export class WarpSuiBuilder implements AdapterWarpBuilder {
  private cache: WarpCache

  constructor(private config: WarpClientConfig) {
    this.cache = new WarpCache(config.cache?.type)
  }

  createInscriptionTransaction(warp: Warp): any {
    throw new Error('Not implemented')
  }

  async createFromTransaction(tx: any, validate = false): Promise<Warp> {
    throw new Error('Not implemented')
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    throw new Error('Not implemented')
  }
}
