import {
  AdapterWarpRegistry,
  Warp,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpCacheConfig,
  WarpChainInfo,
  WarpClientConfig,
} from './types'
import { WarpBuilder } from './WarpBuilder'
import { WarpExecutor } from './WarpExecutor'
import { DetectionResult, WarpLinkDetecter } from './WarpLinkDetecter'

export class WarpClient {
  constructor(private config: WarpClientConfig) {}

  createBuilder(): WarpBuilder {
    return new WarpBuilder(this.config)
  }

  async detectWarp(url: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const detecter = new WarpLinkDetecter(this.config, this.config.repository)
    return detecter.detect(url, cache)
  }

  createInscriptionTransaction(warp: Warp): WarpAdapterGenericTransaction {
    return this.config.repository.builder.createInscriptionTransaction(warp)
  }

  async createFromTransaction(tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return this.config.repository.builder.createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    return this.config.repository.builder.createFromTransactionHash(hash, cache)
  }

  async executeWarp(warp: Warp, inputs: string[]): Promise<[WarpAdapterGenericTransaction | null, WarpChainInfo | null]> {
    return this.executor.execute(warp, inputs)
  }

  get registry(): AdapterWarpRegistry {
    return this.config.repository.registry
  }

  private get executor(): WarpExecutor {
    return new WarpExecutor(this.config)
  }
}
