import { findWarpAdapterByPrefix, findWarpAdapterForChain, getWarpInfoFromIdentifier } from './helpers'
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
import { WarpIndex } from './WarpIndex'
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

  getAdapters(): Adapter[] {
    return this.adapters
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

  async detectWarp(urlOrId: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const detecter = new WarpLinkDetecter(this.config, this.adapters)
    return detecter.detect(urlOrId, cache)
  }

  async executeWarp(
    identifier: string,
    inputs: string[],
    handlers?: ExecutionHandlers,
    options: { cache?: WarpCacheConfig } = {}
  ): Promise<{
    tx: WarpAdapterGenericTransaction | null
    chain: WarpChainInfo | null
    evaluateResults: (remoteTx: WarpAdapterGenericRemoteTransaction) => Promise<void>
  }> {
    const detectionResult = await this.detectWarp(identifier, options.cache)
    if (!detectionResult.match || !detectionResult.warp) throw new Error('Warp not found')
    const executor = this.createExecutor(handlers)
    const { tx, chain } = await executor.execute(detectionResult.warp, inputs)

    const evaluateResults = async (remoteTx: WarpAdapterGenericRemoteTransaction): Promise<void> => {
      if (!chain || !tx || !detectionResult.warp) throw new Error('Warp not found')
      await executor.evaluateResults(detectionResult.warp, chain, remoteTx)
    }

    return { tx, chain, evaluateResults }
  }

  createInscriptionTransaction(chain: WarpChain, warp: Warp): WarpAdapterGenericTransaction {
    return findWarpAdapterForChain(chain, this.adapters).builder.createInscriptionTransaction(warp)
  }

  async createFromTransaction(chain: WarpChain, tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return findWarpAdapterForChain(chain, this.adapters).builder.createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const identifierInfo = getWarpInfoFromIdentifier(hash)
    if (!identifierInfo) throw new Error('WarpClient: createFromTransactionHash - invalid hash')
    const adapter = findWarpAdapterByPrefix(identifierInfo.chainPrefix, this.adapters)
    return adapter.builder.createFromTransactionHash(hash, cache)
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

  get index(): WarpIndex {
    return new WarpIndex(this.config)
  }
}
