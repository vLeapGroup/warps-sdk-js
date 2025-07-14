import { findWarpAdapterForChain } from './helpers'
import {
  Adapter,
  AdapterWarpExplorer,
  AdapterWarpRegistry,
  AdapterWarpResults,
  Warp,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpCacheConfig,
  WarpChain,
  WarpChainInfo,
  WarpClientConfig,
} from './types'
import { WarpBuilder } from './WarpBuilder'
import { ExecutionHandlers, WarpExecutor } from './WarpExecutor'
import { WarpFactory } from './WarpFactory'
import { DetectionResult, WarpLinkDetecter } from './WarpLinkDetecter'

export class WarpClient {
  constructor(
    private config: WarpClientConfig,
    private adapters: Adapter[]
  ) {}

  getConfig(): WarpClientConfig {
    return this.config
  }

  setConfig(config: WarpClientConfig): WarpClient {
    this.config = config
    return this
  }

  addAdapter(adapter: Adapter): WarpClient {
    this.adapters.push(adapter)
    return this
  }

  createBuilder(): WarpBuilder {
    return new WarpBuilder(this.config)
  }

  createExecutor(handlers?: ExecutionHandlers): WarpExecutor {
    return new WarpExecutor(this.config, this.adapters, handlers)
  }

  async detectWarp(url: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const detecter = new WarpLinkDetecter(this.config, this.adapters)
    return detecter.detect(url, cache)
  }

  createInscriptionTransaction(chain: WarpChain, warp: Warp): WarpAdapterGenericTransaction {
    return findWarpAdapterForChain(chain, this.adapters).builder.createInscriptionTransaction(warp)
  }

  async createFromTransaction(chain: WarpChain, tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return findWarpAdapterForChain(chain, this.adapters).builder.createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(chain: WarpChain, hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    return findWarpAdapterForChain(chain, this.adapters).builder.createFromTransactionHash(hash, cache)
  }

  getExplorer(chain: WarpChainInfo): AdapterWarpExplorer {
    return findWarpAdapterForChain(chain.name, this.adapters).explorer(chain)
  }

  getResults(chain: WarpChainInfo): AdapterWarpResults {
    return findWarpAdapterForChain(chain.name, this.adapters).results
  }

  getRegistry(chain: WarpChain): AdapterWarpRegistry {
    return findWarpAdapterForChain(chain, this.adapters).registry
  }

  get factory(): WarpFactory {
    return new WarpFactory(this.config, this.adapters)
  }
}
