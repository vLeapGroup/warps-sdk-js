import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { getMainChainInfo, WarpBrand, WarpBrandBuilder, WarpClientConfig, WarpLogger } from '@vleap/warps'
import { Buffer } from 'buffer'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

export class WarpMultiversxBrandBuilder {
  private core: WarpBrandBuilder

  constructor(private config: WarpClientConfig) {
    this.core = new WarpBrandBuilder(config)
  }

  async createInscriptionTransaction(brand: WarpBrand): Promise<Transaction> {
    const chain = getMainChainInfo(this.config)
    const userWallet = this.config.user?.wallets?.[chain.name]
    if (!userWallet) throw new Error('BrandBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: chain.chainId })
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
    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
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
