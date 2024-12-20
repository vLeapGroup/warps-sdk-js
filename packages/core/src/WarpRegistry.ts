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
import { getChainId, toTypedRegistryInfo } from './helpers'
import { Brand, RegistryInfo, WarpCacheConfig, WarpConfig } from './types'
import { CacheKey, WarpCache } from './WarpCache'

export class WarpRegistry {
  private config: WarpConfig
  private cache: WarpCache = new WarpCache()

  public unitPrice: bigint

  constructor(config: WarpConfig) {
    this.config = config
    this.unitPrice = BigInt(0)
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  createWarpRegisterTransaction(txHash: string, alias?: string | null): Transaction {
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

  createWarpUnregisterTransaction(txHash: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'unregisterWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createWarpAliasSetTransaction(txHash: string, alias: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'setWarpAlias',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.unitPrice,
      arguments: [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  createBrandRegisterTransaction(txHash: string): Transaction {
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

  createWarpPublishTransaction(txHash: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'publishWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.unitPrice,
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createWarpBrandingTransaction(warpHash: string, brandHash: string): Transaction {
    if (!this.config.userAddress) throw new Error('WarpRegistry: user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'brandWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.unitPrice,
      arguments: [BytesValue.fromHex(warpHash), BytesValue.fromHex(brandHash)],
    })
  }

  async getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ registryInfo: RegistryInfo | null; brand: Brand | null }> {
    const cacheKey = CacheKey.RegistryInfo(alias)

    if (cache) {
      const cached = this.cache.get<{ registryInfo: RegistryInfo | null; brand: Brand | null }>(cacheKey)
      if (cached) {
        console.log(`WarpRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
        return cached
      }
    }

    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getInfoByAlias', arguments: [BytesValue.fromUTF8(alias)] })
    const res = await controller.runQuery(query)
    const [registryInfoRaw] = controller.parseQueryResponse(res)
    const registryInfo = registryInfoRaw ? toTypedRegistryInfo(registryInfoRaw) : null
    const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand) : null

    if (cache && cache.ttl) {
      this.cache.set(cacheKey, { registryInfo, brand }, cache.ttl)
    }

    return { registryInfo, brand }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: RegistryInfo | null; brand: Brand | null }> {
    const cacheKey = CacheKey.RegistryInfo(hash)

    if (cache) {
      const cached = this.cache.get<{ registryInfo: RegistryInfo | null; brand: Brand | null }>(cacheKey)
      if (cached) {
        console.log(`WarpRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
        return cached
      }
    }

    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getInfoByHash', arguments: [BytesValue.fromHex(hash)] })
    const res = await controller.runQuery(query)
    const [registryInfoRaw] = controller.parseQueryResponse(res)
    const registryInfo = registryInfoRaw ? toTypedRegistryInfo(registryInfoRaw) : null
    const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand) : null

    if (cache && cache.ttl) {
      this.cache.set(cacheKey, { registryInfo, brand }, cache.ttl)
    }

    return { registryInfo, brand }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<RegistryInfo[]> {
    const userAddress = user || this.config.userAddress
    if (!userAddress) throw new Error('WarpRegistry: user address not set')
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getUserWarps', arguments: [new AddressValue(new Address(userAddress))] })
    const res = await controller.runQuery(query)
    const [registryInfosRaw] = controller.parseQueryResponse(res)
    return registryInfosRaw.map(toTypedRegistryInfo)
  }

  async getUserBrands(user?: string): Promise<Brand[]> {
    const userAddress = user || this.config.userAddress
    if (!userAddress) throw new Error('WarpRegistry: user address not set')
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getUserBrands', arguments: [new AddressValue(new Address(userAddress))] })
    const res = await controller.runQuery(query)
    const [brandsRaw] = controller.parseQueryResponse(res)
    const brandHashes: string[] = brandsRaw.map((b: any) => b.toString('hex'))
    const brandCacheConfig: WarpCacheConfig = { ttl: 365 * 24 * 60 * 60 } // 1 year
    const brands = await Promise.all(brandHashes.map((hash) => this.fetchBrand(hash, brandCacheConfig)))
    return brands.filter((b) => b !== null) as Brand[]
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<Brand | null> {
    const cacheKey = CacheKey.Brand(hash)

    if (cache) {
      const cached = this.cache.get<Brand>(cacheKey)
      if (cached) {
        console.log(`WarpRegistry (fetchBrand): Brand found in cache: ${hash}`)
        return cached
      }
    }

    const networkProvider = new ApiNetworkProvider(this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env))

    try {
      const tx = await networkProvider.getTransaction(hash)
      const brand = JSON.parse(tx.data.toString()) as Brand

      brand.meta = {
        hash: tx.hash,
        creator: tx.sender.bech32(),
        createdAt: new Date(tx.timestamp * 1000).toISOString(),
      }

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
