import { AbiRegistry, TransactionOnNetwork } from '@multiversx/sdk-core'
import {
  AdapterWarpAbiBuilder,
  getMainChainInfo,
  WarpAbi,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpClientConfig,
  WarpConstants,
  WarpContractAction,
  WarpLogger,
  WarpQueryAction,
} from '@vleap/warps'
import { WarpMultiversxContractLoader } from './WarpMultiversxContractLoader'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { WarpMultiversxConstants } from './constants'

export class WarpMultiversxAbiBuilder implements AdapterWarpAbiBuilder {
  private readonly contractLoader: WarpMultiversxContractLoader
  private readonly cache: WarpCache

  constructor(private readonly config: WarpClientConfig) {
    this.contractLoader = new WarpMultiversxContractLoader(this.config)
    this.cache = new WarpCache(this.config.cache?.type)
  }

  async createFromRaw(encoded: string): Promise<WarpAbi> {
    return JSON.parse(encoded) as WarpAbi
  }

  async createFromTransaction(tx: TransactionOnNetwork): Promise<WarpAbi> {
    const abi = await this.createFromRaw(tx.data.toString())

    abi.meta = {
      chain: WarpMultiversxConstants.ChainName,
      hash: tx.hash,
      creator: tx.sender.bech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return abi
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpAbi | null> {
    const cacheKey = WarpCacheKey.WarpAbi(this.config.env, hash)

    if (cache) {
      const cached = this.cache.get<WarpAbi>(cacheKey)
      if (cached) {
        WarpLogger.info(`WarpAbiBuilder (createFromTransactionHash): Warp abi found in cache: ${hash}`)
        return cached
      }
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const abi = await this.createFromTransaction(tx)

      if (cache && cache.ttl && abi) {
        this.cache.set(cacheKey, abi, cache.ttl)
      }

      return abi
    } catch (error) {
      WarpLogger.error('WarpAbiBuilder: Error creating from transaction hash', error)
      return null
    }
  }

  async getAbiForAction(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }
    if (!action.address) throw new Error('WarpActionExecutor: Address not found')
    const chainInfo = getMainChainInfo(this.config)
    const verification = await this.contractLoader.getVerificationInfo(action.address, chainInfo)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  async fetchAbi(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    if (action.abi.startsWith(WarpConstants.IdentifierType.Hash)) {
      const hashValue = action.abi.split(WarpConstants.IdentifierParamSeparator)[1]
      const abi = await this.createFromTransactionHash(hashValue)
      if (!abi) throw new Error(`WarpActionExecutor: ABI not found for hash: ${action.abi}`)
      return AbiRegistry.create(abi.content)
    } else {
      const abiRes = await fetch(action.abi)
      const abiContents = await abiRes.json()
      return AbiRegistry.create(abiContents)
    }
  }
}
