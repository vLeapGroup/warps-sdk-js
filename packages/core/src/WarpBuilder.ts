import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { getChainId, getLatestProtocolIdentifier, getMainChainInfo, toPreviewText } from './helpers/general'
import { Warp, WarpAction, WarpCacheConfig, WarpConfig } from './types'
import { CacheKey, WarpCache } from './WarpCache'
import { WarpUtils } from './WarpUtils'
import { WarpValidator } from './WarpValidator'

export class WarpBuilder {
  private config: WarpConfig
  private cache: WarpCache

  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier('warp'),
    name: '',
    title: '',
    description: null,
    preview: '',
    actions: [],
  }

  constructor(config: WarpConfig) {
    this.config = config
    this.cache = new WarpCache(config.cacheType)
  }

  createInscriptionTransaction(warp: Warp): Transaction {
    if (!this.config.userAddress) throw new Error('WarpBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(this.config.userAddress)
    const serialized = JSON.stringify(warp)

    const tx = factory.createTransactionForTransfer(sender, {
      receiver: Address.newFromBech32(this.config.userAddress),
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })

    tx.gasLimit = tx.gasLimit + BigInt(2_000_000) // overestimate to avoid gas limit errors for slight inaccuracies

    return tx
  }

  async createFromRaw(encoded: string, validate = true): Promise<Warp> {
    const warp = JSON.parse(encoded) as Warp

    if (validate) {
      const validator = new WarpValidator(this.config)
      await validator.validate(warp)
    }

    return WarpUtils.prepareVars(warp, this.config)
  }

  async createFromTransaction(tx: TransactionOnNetwork, validate = false): Promise<Warp> {
    const warp = await this.createFromRaw(tx.data.toString(), validate)

    warp.meta = {
      hash: tx.hash,
      creator: tx.sender.bech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return warp
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const cacheKey = CacheKey.Warp(hash)

    if (cache) {
      const cached = this.cache.get<Warp>(cacheKey)
      if (cached) {
        console.log(`WarpBuilder (createFromTransactionHash): Warp found in cache: ${hash}`)
        return cached
      }
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const warp = await this.createFromTransaction(tx)

      if (cache && cache.ttl && warp) {
        this.cache.set(cacheKey, warp, cache.ttl)
      }

      return warp
    } catch (error) {
      console.error('WarpBuilder: Error creating from transaction hash', error)
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

    const validator = new WarpValidator(this.config)
    const validationResult = await validator.validate(this.pendingWarp)

    if (!validationResult.valid) {
      throw new Error(validationResult.errors.join('\n'))
    }

    return this.pendingWarp
  }

  getDescriptionPreview(description: string, maxChars = 100): string {
    return toPreviewText(description, maxChars)
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(`WarpBuilder: ${errorMessage}`)
    }
  }
}
