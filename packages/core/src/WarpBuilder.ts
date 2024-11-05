import { Address, Transaction, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { Config } from './config'
import { getChainId } from './helpers'
import { ChainEnv, Warp, WarpAction } from './types'

export class WarpFactory {
  public version: string = Config.LatestVersion

  private pendingWarp: Warp = {
    version: Config.LatestVersion,
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

    const serialized = Buffer.from(JSON.stringify(warp)).toString('base64')
    const data = new TextEncoder().encode(serialized)

    return factory.createTransactionForNativeTokenTransfer({
      sender: Address.newFromBech32(warp.owner),
      receiver: Address.newFromBech32(warp.owner),
      nativeAmount: BigInt(0),
      data,
    })
  }

  setTitle(title: string): WarpFactory {
    this.pendingWarp.title = title
    return this
  }

  setDescription(description: string): WarpFactory {
    this.pendingWarp.description = description
    return this
  }

  setPreview(preview: string): WarpFactory {
    this.pendingWarp.preview = preview
    return this
  }

  addAction(action: WarpAction): WarpFactory {
    this.pendingWarp.actions.push(action)
    return this
  }

  setOwner(owner: string): WarpFactory {
    this.pendingWarp.owner = owner
    return this
  }

  build(): Warp {
    this.ensure(this.pendingWarp.version, 'version is required')
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
