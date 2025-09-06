import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { WarpBrand, WarpBrandBuilder, WarpChainInfo, WarpClientConfig, WarpLogger } from '@vleap/warps'
import { Buffer } from 'buffer'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

export class WarpMultiversxBrandBuilder {
  private readonly core: WarpBrandBuilder

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.core = new WarpBrandBuilder(config)
  }

  async createInscriptionTransaction(brand: WarpBrand): Promise<Transaction> {
    const userWallet = this.config.user?.wallets?.[this.chain.name]
    if (!userWallet) throw new Error('BrandBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: this.chain.chainId })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(userWallet)
    const serialized = JSON.stringify(brand)

    return await factory.createTransactionForNativeTokenTransfer(sender, {
      receiver: Address.newFromBech32(userWallet),
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })
  }

  async createFromTransaction(tx: TransactionOnNetwork, validateSchema = false): Promise<WarpBrand> {
    const brand = await this.core.createFromRaw(tx.data.toString(), validateSchema)

    brand.meta = {
      chain: this.chain.name,
      hash: tx.hash,
      creator: tx.sender.toBech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return brand
  }

  async createFromTransactionHash(hash: string): Promise<WarpBrand | null> {
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      return this.createFromTransaction(tx)
    } catch (error) {
      WarpLogger.error('BrandBuilder: Error creating from transaction hash', error)
      return null
    }
  }
}
