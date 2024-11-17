import {
  AbiRegistry,
  Address,
  AddressValue,
  ApiNetworkProvider,
  BytesValue,
  QueryRunnerAdapter,
  SmartContractQueriesController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core/out'
import RegistryAbi from './abis/registry.abi.json'
import { Config } from './config'
import { getChainId, toTypedWarpInfo } from './helpers'
import { Brand, WarpCacheConfig, WarpConfig, WarpInfo } from './types'
import { CacheKey, WarpCache } from './WarpCache'

export class WarpRegistry {
  private config: WarpConfig
  private unitPrice: bigint
  private cache: WarpCache = new WarpCache()

  constructor(config: WarpConfig) {
    this.config = config
    this.unitPrice = BigInt(0)
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  createRegisterWarpTransaction(txHash: string, alias?: string | null): Transaction {
    if (this.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')
    const costAmount = alias ? this.unitPrice * BigInt(2) : this.unitPrice

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'registerWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: costAmount,
      arguments: alias ? [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)] : [BytesValue.fromHex(txHash)],
    })
  }

  createRegisterBrandTransaction(txHash: string): Transaction {
    if (this.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'registerBrand',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.unitPrice,
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createAliasAssignTransaction(txHash: string, alias: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'assignAlias',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  createPublishWarpTransaction(txHash: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'publishWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ warp: WarpInfo | null; brand: Brand | null }> {
    const cacheKey = CacheKey.WarpInfo(alias)

    if (cache) {
      const cached = this.cache.get<{ warp: WarpInfo | null; brand: Brand | null }>(cacheKey)
      if (cached) return cached
    }

    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getInfoByAlias', arguments: [BytesValue.fromUTF8(alias)] })
    const res = await controller.runQuery(query)
    const [warpInfoRaw] = controller.parseQueryResponse(res)
    const warp = warpInfoRaw ? toTypedWarpInfo(warpInfoRaw) : null
    const brand = warp?.brand ? await this.fetchBrand(warp.brand) : null

    if (cache && cache.ttl) {
      this.cache.set(cacheKey, { warp, brand }, cache.ttl)
    }
    return { warp, brand }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ warp: WarpInfo | null; brand: Brand | null }> {
    const cacheKey = CacheKey.WarpInfo(hash)

    if (cache) {
      const cached = this.cache.get<{ warp: WarpInfo | null; brand: Brand | null }>(cacheKey)
      if (cached) return cached
    }

    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getInfoByHash', arguments: [BytesValue.fromUTF8(hash)] })
    const res = await controller.runQuery(query)
    const [warpInfoRaw] = controller.parseQueryResponse(res)
    const warp = warpInfoRaw ? toTypedWarpInfo(warpInfoRaw) : null
    const brand = warp?.brand ? await this.fetchBrand(warp.brand) : null

    if (cache && cache.ttl) {
      this.cache.set(cacheKey, { warp, brand }, cache.ttl)
    }

    return { warp, brand }
  }

  async getUserWarpInfos(user?: string): Promise<WarpInfo[]> {
    const userAddress = user || this.config.userAddress
    if (!userAddress) throw new Error('WarpRegistry: user address not set')
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getUserWarps', arguments: [new AddressValue(new Address(userAddress))] })
    const res = await controller.runQuery(query)
    const warpInfosRaw = controller.parseQueryResponse(res)
    return warpInfosRaw.map(toTypedWarpInfo)
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<Brand | null> {
    const cacheKey = CacheKey.Brand(hash)

    if (cache) {
      const cached = this.cache.get<Brand>(cacheKey)
      if (cached) return cached
    }

    const networkProvider = new ApiNetworkProvider(this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env))

    try {
      const tx = await networkProvider.getTransaction(hash)
      const brand = JSON.parse(tx.data.toString()) as Brand

      if (cache && cache.ttl) {
        this.cache.set(cacheKey, brand, cache.ttl)
      }

      return brand
    } catch (error) {
      console.error('WarpRegistry: Error fetching brand from transaction hash', error)
      return null
    }
  }

  private async loadRegistryConfigs(): Promise<void> {
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getConfig', arguments: [] })
    const res = await controller.runQuery(query)
    const [unitPriceRaw] = controller.parseQueryResponse(res)

    const unitPrice = BigInt(unitPriceRaw.toString())

    this.unitPrice = unitPrice
  }

  private getFactory(): SmartContractTransactionsFactory {
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractTransactionsFactory({ config, abi })
  }

  private getController(): SmartContractQueriesController {
    const apiUrl = this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env)
    const networkProvider = new ApiNetworkProvider(apiUrl, { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: networkProvider })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractQueriesController({ queryRunner, abi })
  }
}
