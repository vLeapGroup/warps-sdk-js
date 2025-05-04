import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { getChainId, getLatestProtocolIdentifier, getMainChainInfo } from './helpers'
import { AbiContents, WarpAbi, WarpCacheConfig, WarpConfig } from './types'
import { CacheKey, WarpCache } from './WarpCache'
import { WarpUtils } from './WarpUtils'

export class WarpAbiBuilder {
  private config: WarpConfig
  private cache: WarpCache = new WarpCache()

  constructor(config: WarpConfig) {
    this.config = config
  }

  createInscriptionTransaction(abi: AbiContents): Transaction {
    if (!this.config.userAddress) throw new Error('WarpBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })

    const warpAbi: WarpAbi = {
      protocol: getLatestProtocolIdentifier('abi'),
      content: abi,
    }

    const sender = Address.newFromBech32(this.config.userAddress)
    const serialized = JSON.stringify(warpAbi)

    const tx = factory.createTransactionForTransfer(sender, {
      receiver: sender,
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })

    tx.gasLimit = tx.gasLimit + BigInt(2_000_000) // overestimate to avoid gas limit errors for slight inaccuracies

    return tx
  }

  async createFromRaw(encoded: string): Promise<WarpAbi> {
    return JSON.parse(encoded) as WarpAbi
  }

  async createFromTransaction(tx: TransactionOnNetwork): Promise<WarpAbi> {
    const abi = await this.createFromRaw(tx.data.toString())

    abi.meta = {
      hash: tx.hash,
      creator: tx.sender.bech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return abi
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpAbi | null> {
    const cacheKey = CacheKey.WarpAbi(hash)

    if (cache) {
      const cached = this.cache.get<WarpAbi>(cacheKey)
      if (cached) {
        console.log(`WarpAbiBuilder (createFromTransactionHash): Warp abi found in cache: ${hash}`)
        return cached
      }
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const abi = await this.createFromTransaction(tx)

      if (cache && cache.ttl && abi) {
        this.cache.set(cacheKey, abi, cache.ttl)
      }

      return abi
    } catch (error) {
      console.error('WarpAbiBuilder: Error creating from transaction hash', error)
      return null
    }
  }
}
