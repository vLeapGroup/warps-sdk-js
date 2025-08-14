import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { WarpBrand, WarpBrandBuilder, WarpChain, WarpChainInfo, WarpClientConfig, WarpLogger } from '@vleap/warps'
import { Buffer } from 'buffer'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

export class WarpMultiversxBrandBuilder {
  private readonly core: WarpBrandBuilder

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChain,
    private readonly chainInfo: WarpChainInfo
  ) {
    this.core = new WarpBrandBuilder(config)
  }

  async createInscriptionTransaction(brand: WarpBrand): Promise<Transaction> {
    const userWallet = this.config.user?.wallets?.[this.chain]
    if (!userWallet) throw new Error('BrandBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: this.chainInfo.chainId })
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
    return await this.core.createFromRaw(tx.data.toString(), validateSchema)
  }

  async createFromTransactionHash(hash: string): Promise<WarpBrand | null> {
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(this.chainInfo, this.config.env)
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
