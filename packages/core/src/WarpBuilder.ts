import {
  Address,
  ApiNetworkProvider,
  Transaction,
  TransactionOnNetwork,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core'
import Ajv from 'ajv'
import { Config } from './config'
import { getChainId, getLatestProtocolIdentifier } from './helpers'
import { Warp, WarpAction, WarpCacheConfig, WarpConfig } from './types'
import { CacheKey, WarpCache } from './WarpCache'
import { WarpUtils } from './WarpUtils'

export class WarpBuilder {
  private config: WarpConfig
  private cache: WarpCache = new WarpCache()

  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier(Config.ProtocolNameWarp),
    name: '',
    title: '',
    description: null,
    preview: '',
    actions: [],
  }

  constructor(config: WarpConfig) {
    this.config = config
  }

  createInscriptionTransaction(warp: Warp): Transaction {
    if (!this.config.userAddress) throw new Error('WarpBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })

    const serialized = JSON.stringify(warp)

    return factory.createTransactionForNativeTokenTransfer({
      sender: Address.newFromBech32(this.config.userAddress),
      receiver: Address.newFromBech32(this.config.userAddress),
      nativeAmount: BigInt(0),
      data: Buffer.from(serialized).valueOf(),
    })
  }

  async createFromRaw(encoded: string, validateSchema = true): Promise<Warp> {
    const warp = JSON.parse(encoded) as Warp

    if (validateSchema) {
      await this.ensureValidSchema(warp)
    }

    return WarpUtils.prepareVars(warp, this.config)
  }

  async createFromTransaction(tx: TransactionOnNetwork, validateSchema = false): Promise<Warp> {
    const warp = await this.createFromRaw(tx.data.toString(), validateSchema)

    warp.meta = {
      hash: tx.hash,
      creator: tx.sender.bech32(),
      createdAt: new Date(tx.timestamp).toISOString(),
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

    const networkProvider = new ApiNetworkProvider(this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env))

    try {
      const tx = await networkProvider.getTransaction(hash)
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

    await this.ensureValidSchema(this.pendingWarp)

    return this.pendingWarp
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(`WarpBuilder: ${errorMessage}`)
    }
  }

  private async ensureValidSchema(warp: Warp): Promise<void> {
    const schemaUrl = this.config.warpSchemaUrl || Config.LatestWarpSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(warp)) {
      throw new Error(`WarpBuilder: schema validation failed: ${ajv.errorsText(validate.errors)}`)
    }
  }
}
