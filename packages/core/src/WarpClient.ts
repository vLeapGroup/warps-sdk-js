import { findWarpAdapter } from './helpers'
import {
  AdapterWarpExplorer,
  AdapterWarpRegistry,
  AdapterWarpResults,
  Warp,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpCacheConfig,
  WarpChainInfo,
  WarpClientConfig,
} from './types'
import { WarpBuilder } from './WarpBuilder'
import { ExecutionHandlers, WarpExecutor } from './WarpExecutor'
import { WarpFactory } from './WarpFactory'
import { DetectionResult, WarpLinkDetecter } from './WarpLinkDetecter'

export class WarpClient {
  constructor(private config: WarpClientConfig) {}

  getConfig(): WarpClientConfig {
    return this.config
  }

  setConfig(config: WarpClientConfig): WarpClient {
    this.config = config
    return this
  }

  createBuilder(): WarpBuilder {
    return new WarpBuilder(this.config)
  }

  createExecutor(handlers?: ExecutionHandlers): WarpExecutor {
    return new WarpExecutor(this.config, handlers)
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

  getExplorer(chain: WarpChainInfo): AdapterWarpExplorer {
    return findWarpAdapter(this.config, chain).explorer(chain)
  }

  getResults(chain: WarpChainInfo): AdapterWarpResults {
    return findWarpAdapter(this.config, chain).results
  }

  get factory(): WarpFactory {
    return new WarpFactory(this.config)
  }

  get registry(): AdapterWarpRegistry {
    return this.config.repository.registry
  }
}
