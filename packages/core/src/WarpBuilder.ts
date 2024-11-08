import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { getChainId, getLatestProtocolIdentifier } from './helpers'
import { ChainEnv, Warp, WarpAction } from './types'

export class WarpBuilder {
  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier(),
    name: '',
    title: '',
    description: null,
    preview: '',
    actions: [],
    owner: '',
  }

  constructor(name: string) {
    this.pendingWarp.name = name
  }

  static createInscriptionTransaction(warp: Warp, config: { env: ChainEnv }): Transaction {
    const factoryConfig = new TransactionsFactoryConfig({ chainID: getChainId(config.env) })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })

    const serialized = JSON.stringify(warp)

    return factory.createTransactionForNativeTokenTransfer({
      sender: Address.newFromBech32(warp.owner),
      receiver: Address.newFromBech32(warp.owner),
      nativeAmount: BigInt(0),
      data: Buffer.from(serialized).valueOf(),
    })
  }

  static createFromRaw(encoded: string): Warp {
    return JSON.parse(encoded) as Warp
  }

  static createFromTransaction(tx: TransactionOnNetwork): Warp {
    return WarpBuilder.createFromRaw(tx.data.toString())
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

  setOwner(owner: string): WarpBuilder {
    this.pendingWarp.owner = owner
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

  build(): Warp {
    this.ensure(this.pendingWarp.protocol, 'protocol is required')
    this.ensure(this.pendingWarp.name, 'name is required')
    this.ensure(this.pendingWarp.title, 'title is required')
    this.ensure(this.pendingWarp.actions.length > 0, 'actions are required')
    this.ensure(this.pendingWarp.owner, 'owner is required')

    return this.pendingWarp
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(`Warp: ${errorMessage}`)
    }
  }
}
