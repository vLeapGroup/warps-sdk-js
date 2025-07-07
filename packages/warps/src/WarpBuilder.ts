import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { WarpMultiversxExecutor } from '@vleap/warps-adapter-multiversx'
import {
  getLatestProtocolIdentifier,
  getMainChainInfo,
  toPreviewText,
  Warp,
  WarpAction,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpInitConfig,
  WarpLogger,
  WarpValidator,
} from '@vleap/warps-core'

export class WarpBuilder {
  private config: WarpInitConfig
  private cache: WarpCache

  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier('warp'),
    name: '',
    title: '',
    description: null,
    preview: '',
    actions: [],
  }

  constructor(config: WarpInitConfig) {
    this.config = config
    this.cache = new WarpCache(config.cache?.type)
  }

  createInscriptionTransaction(warp: Warp): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpBuilder: user address not set')
    const chain = getMainChainInfo(this.config)
    const factoryConfig = new TransactionsFactoryConfig({ chainID: chain.chainId })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(this.config.user.wallet)
    const serialized = JSON.stringify(warp)

    const tx = factory.createTransactionForTransfer(sender, {
      receiver: Address.newFromBech32(this.config.user.wallet),
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })

    tx.gasLimit = tx.gasLimit + BigInt(2_000_000) // overestimate to avoid gas limit errors for slight inaccuracies

    return tx
  }

  async createFromRaw(encoded: string, validate = true): Promise<Warp> {
    const warp = JSON.parse(encoded) as Warp

    if (validate) {
      await this.validate(warp)
    }

    return warp
  }

  async createFromTransaction(tx: TransactionOnNetwork, validate = false): Promise<Warp> {
    const warp = await this.createFromRaw(tx.data.toString(), validate)

    warp.meta = {
      hash: tx.hash,
      creator: tx.sender.toBech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return warp
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const cacheKey = WarpCacheKey.Warp(this.config.env, hash)

    if (cache) {
      const cached = this.cache.get<Warp>(cacheKey)
      if (cached) {
        WarpLogger.info(`WarpBuilder (createFromTransactionHash): Warp found in cache: ${hash}`)
        return cached
      }
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const warp = await this.createFromTransaction(tx)

      if (cache && cache.ttl && warp) {
        this.cache.set(cacheKey, warp, cache.ttl)
      }

      return warp
    } catch (error) {
      WarpLogger.error('WarpBuilder: Error creating from transaction hash', error)
      return null
    }
  }

  setName(name: string): WarpBuilder {
    this.pendingWarp.name = name
    return this
  }

  setTitle(title: string): WarpBuilder {
    this.pendingWarp.title = title
    return this
  }

  setDescription(description: string): WarpBuilder {
    this.pendingWarp.description = description
    return this
  }

  setPreview(preview: string): WarpBuilder {
    this.pendingWarp.preview = preview
    return this
  }

  setActions(actions: WarpAction[]): WarpBuilder {
    this.pendingWarp.actions = actions
    return this
  }

  addAction(action: WarpAction): WarpBuilder {
    this.pendingWarp.actions.push(action)
    return this
  }

  async build(): Promise<Warp> {
    this.ensure(this.pendingWarp.protocol, 'protocol is required')
    this.ensure(this.pendingWarp.name, 'name is required')
    this.ensure(this.pendingWarp.title, 'title is required')
    this.ensure(this.pendingWarp.actions.length > 0, 'actions are required')

    await this.validate(this.pendingWarp)

    return this.pendingWarp
  }

  getDescriptionPreview(description: string, maxChars = 100): string {
    return toPreviewText(description, maxChars)
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(errorMessage)
    }
  }

  private async validate(warp: Warp): Promise<void> {
    const validator = new WarpValidator(this.config)
    const validationResult = await validator.validate(warp)

    if (!validationResult.valid) {
      throw new Error(validationResult.errors.join('\n'))
    }
  }
}
