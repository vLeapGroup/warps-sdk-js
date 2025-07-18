import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import {
  AdapterWarpBuilder,
  getMainChainInfo,
  Warp,
  WarpBuilder,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpClientConfig,
  WarpLogger,
} from '@vleap/warps'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { WarpMultiversxConstants } from './constants'

export class WarpMultiversxBuilder extends WarpBuilder implements AdapterWarpBuilder {
  private cache: WarpCache
  private core: WarpBuilder

  constructor(protected readonly config: WarpClientConfig) {
    super(config)
    this.cache = new WarpCache(config.cache?.type)
    this.core = new WarpBuilder(config)
  }

  createInscriptionTransaction(warp: Warp): Transaction {
    const chain = getMainChainInfo(this.config)
    const userWallet = this.config.user?.wallets?.[chain.name]
    if (!userWallet) throw new Error('WarpBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: chain.chainId })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(userWallet)
    const serialized = JSON.stringify(warp)

    const tx = factory.createTransactionForTransfer(sender, {
      receiver: Address.newFromBech32(userWallet),
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })

    tx.gasLimit = tx.gasLimit + BigInt(2_000_000) // overestimate to avoid gas limit errors for slight inaccuracies

    return tx
  }

  async createFromTransaction(tx: TransactionOnNetwork, validate = false): Promise<Warp> {
    const warp = await this.core.createFromRaw(tx.data.toString(), validate)

    warp.meta = {
      chain: WarpMultiversxConstants.ChainName,
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
}
