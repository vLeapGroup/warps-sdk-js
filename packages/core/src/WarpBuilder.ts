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
import { Warp, WarpAction, WarpConfig } from './types'

export class WarpBuilder {
  private config: WarpConfig

  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier(),
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
    if (!this.config.userAddress) throw new Error('warp builder user address not set')
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

  createFromRaw(encoded: string): Warp {
    return JSON.parse(encoded) as Warp
  }

  createFromTransaction(tx: TransactionOnNetwork): Warp {
    return this.createFromRaw(tx.data.toString())
  }

  async createFromTransactionHash(hash: string): Promise<Warp | null> {
    const networkProvider = new ApiNetworkProvider(this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env))

    try {
      const tx = await networkProvider.getTransaction(hash)
      return this.createFromTransaction(tx)
    } catch (error) {
      console.error('Error creating warp from transaction hash', error)
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

    await this.ensureValidSchema()

    return this.pendingWarp
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(`Warp: ${errorMessage}`)
    }
  }

  private async ensureValidSchema(): Promise<void> {
    const schemaUrl = this.config.schemaUrl || Config.LatestSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(this.pendingWarp)) {
      throw new Error(`Warp schema validation failed: ${ajv.errorsText(validate.errors)}`)
    }
  }
}
