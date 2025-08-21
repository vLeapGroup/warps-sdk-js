import { findWarpAdapterByPrefix, findWarpAdapterForChain, getWarpInfoFromIdentifier } from './helpers'

import {
  Adapter,
  AdapterWarpDataLoader,
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
import { ExecutionHandlers, WarpExecutor } from './WarpExecutor'
import { WarpFactory } from './WarpFactory'
import { WarpIndex } from './WarpIndex'
import { WarpLinkBuilder } from './WarpLinkBuilder'
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
    const warp =
      identifier.startsWith('http') && identifier.endsWith('.json')
        ? ((await fetch(identifier)).json() as unknown as Warp)
        : (await this.detectWarp(identifier, options.cache)).warp

    if (!warp) throw new Error('Warp not found')
    const executor = this.createExecutor(handlers)
    const { tx, chain } = await executor.execute(warp, inputs)

    const evaluateResults = async (remoteTx: WarpAdapterGenericRemoteTransaction): Promise<void> => {
      if (!chain || !tx || !warp) throw new Error('Warp not found')
      await executor.evaluateResults(warp, chain.name, remoteTx)
    }

    return { tx, chain, evaluateResults }
  }

  createInscriptionTransaction(chain: WarpChain, warp: Warp): WarpAdapterGenericTransaction {
    return findWarpAdapterForChain(chain, this.adapters).builder().createInscriptionTransaction(warp)
  }

  async createFromTransaction(chain: WarpChain, tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return findWarpAdapterForChain(chain, this.adapters).builder().createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const identifierInfo = getWarpInfoFromIdentifier(hash)
    if (!identifierInfo) throw new Error('WarpClient: createFromTransactionHash - invalid hash')
    const adapter = findWarpAdapterByPrefix(identifierInfo.chainPrefix, this.adapters)
    return adapter.builder().createFromTransactionHash(hash, cache)
  }

  async signMessage(chain: WarpChain, message: string, privateKey: string): Promise<string> {
    const walletAddress = this.config.user?.wallets?.[chain]
    if (!walletAddress) throw new Error(`No wallet configured for chain ${chain}`)

    const adapter = findWarpAdapterForChain(chain, this.adapters)
    return adapter.executor.signMessage(message, privateKey)
  }

  getExplorer(chain: WarpChain): AdapterWarpExplorer {
    return findWarpAdapterForChain(chain, this.adapters).explorer
  }

  getResults(chain: WarpChain): AdapterWarpResults {
    return findWarpAdapterForChain(chain, this.adapters).results
  }

  async getRegistry(chain: WarpChain): Promise<AdapterWarpRegistry> {
    const registry = findWarpAdapterForChain(chain, this.adapters).registry
    await registry.init()
    return registry
  }

  getDataLoader(chain: WarpChain): AdapterWarpDataLoader {
    return findWarpAdapterForChain(chain, this.adapters).dataLoader
  }

  get factory(): WarpFactory {
    return new WarpFactory(this.config, this.adapters)
  }

  get index(): WarpIndex {
    return new WarpIndex(this.config)
  }

  get linkBuilder(): WarpLinkBuilder {
    return new WarpLinkBuilder(this.config, this.adapters)
  }

  createBuilder(chain: WarpChain) {
    return findWarpAdapterForChain(chain, this.adapters).builder()
  }

  createAbiBuilder(chain: WarpChain) {
    return findWarpAdapterForChain(chain, this.adapters).abiBuilder()
  }

  createBrandBuilder(chain: WarpChain) {
    return findWarpAdapterForChain(chain, this.adapters).brandBuilder()
  }
}
