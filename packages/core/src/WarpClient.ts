import { findWarpAdapterForChain, getWarpInfoFromIdentifier } from './helpers'
import { resolveWarpText } from './helpers/i18n'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'

import {
  Adapter,
  AdapterWarpDataLoader,
  AdapterWarpExplorer,
  AdapterWarpRegistry,
  AdapterWarpResults,
  AdapterWarpSerializer,
  AdapterWarpWallet,
  Warp,
  WarpActionExecution,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpCacheConfig,
  WarpChain,
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
} from './types'
import { WarpText } from './types/i18n'
import { ExecutionHandlers, WarpExecutor } from './WarpExecutor'
import { WarpFactory } from './WarpFactory'
import { WarpIndex } from './WarpIndex'
import { WarpLinkBuilder } from './WarpLinkBuilder'
import { DetectionResult, WarpLinkDetecter } from './WarpLinkDetecter'

export class WarpClient {
  constructor(
    private readonly config: WarpClientConfig,
    private adapters: Adapter[]
  ) {}

  getConfig(): WarpClientConfig {
    return this.config
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
    warpOrIdentifierOrUrl: string | Warp,
    inputs: string[],
    handlers?: ExecutionHandlers,
    params: { cache?: WarpCacheConfig; queries?: Record<string, any> } = {}
  ): Promise<{
    txs: WarpAdapterGenericTransaction[]
    chain: WarpChainInfo | null
    immediateExecutions: WarpActionExecution[]
    evaluateResults: (remoteTxs: WarpAdapterGenericRemoteTransaction[]) => Promise<void>
  }> {
    const isWarp = typeof warpOrIdentifierOrUrl === 'object'
    const isUrl = !isWarp && warpOrIdentifierOrUrl.startsWith('http') && warpOrIdentifierOrUrl.endsWith('.json')

    let warp: Warp | null = isWarp ? warpOrIdentifierOrUrl : null

    if (!warp && isUrl) {
      const response = await fetch(warpOrIdentifierOrUrl)
      if (!response.ok) throw new Error('WarpClient: executeWarp - invalid url')
      warp = (await response.json()) as Warp
    }

    if (!warp) {
      warp = (await this.detectWarp(warpOrIdentifierOrUrl as string, params.cache)).warp
    }

    if (!warp) throw new Error('Warp not found')

    const executor = this.createExecutor(handlers)
    const { txs, chain, immediateExecutions } = await executor.execute(warp, inputs, {
      queries: params.queries,
    })

    const evaluateResults = async (actions: WarpChainAction[]): Promise<void> => {
      await executor.evaluateResults(warp, actions)
    }

    return { txs, chain, immediateExecutions, evaluateResults }
  }

  async createInscriptionTransaction(chain: WarpChain, warp: Warp): Promise<WarpAdapterGenericTransaction> {
    return await findWarpAdapterForChain(chain, this.adapters).builder().createInscriptionTransaction(warp)
  }

  async createFromTransaction(chain: WarpChain, tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return findWarpAdapterForChain(chain, this.adapters).builder().createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const identifierInfo = getWarpInfoFromIdentifier(hash)
    if (!identifierInfo) throw new Error('WarpClient: createFromTransactionHash - invalid hash')
    const adapter = findWarpAdapterForChain(identifierInfo.chain, this.adapters)
    return adapter.builder().createFromTransactionHash(hash, cache)
  }

  async signMessage(chain: WarpChain, message: string): Promise<string> {
    const walletAddress = getWarpWalletAddressFromConfig(this.config, chain)
    if (!walletAddress) throw new Error(`No wallet configured for chain ${chain}`)

    const adapter = findWarpAdapterForChain(chain, this.adapters)
    return adapter.wallet.signMessage(message)
  }

  async getActions(chain: WarpChain, ids: string[], awaitCompleted = false): Promise<WarpChainAction[]> {
    const dataLoader = this.getDataLoader(chain)
    const actions = await Promise.all(ids.map(async (id) => dataLoader.getAction(id, awaitCompleted)))
    return actions.filter((action) => action !== null)
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

  getWallet(chain: WarpChain): AdapterWarpWallet {
    return findWarpAdapterForChain(chain, this.adapters).wallet
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

  createSerializer(chain: WarpChain): AdapterWarpSerializer {
    return findWarpAdapterForChain(chain, this.adapters).serializer
  }

  resolveText(warpText: WarpText): string {
    return resolveWarpText(warpText, this.config)
  }
}
