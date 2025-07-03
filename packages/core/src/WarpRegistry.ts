import {
  AbiRegistry,
  Address,
  AddressValue,
  BytesValue,
  SmartContractController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core/out'
import RegistryAbi from './abis/registry.abi.json'
import { WarpConfig } from './config'
import { getMainChainInfo, toTypedChainInfo } from './helpers/general'
import { toTypedConfigInfo, toTypedRegistryInfo } from './helpers/registry'
import { Brand, WarpCacheConfig, WarpChain, WarpChainInfo, WarpInitConfig, WarpRegistryConfigInfo, WarpRegistryInfo } from './types'
import { string, u32 } from './utils.codec'
import { CacheKey, WarpCache } from './WarpCache'
import { WarpLogger } from './WarpLogger'
import { WarpUtils } from './WarpUtils'

export class WarpRegistry {
  private config: WarpInitConfig
  private cache: WarpCache

  public registryConfig: WarpRegistryConfigInfo

  constructor(config: WarpInitConfig) {
    this.config = config
    this.cache = new WarpCache(config.cache?.type)
    this.registryConfig = {
      unitPrice: BigInt(0),
      admins: [],
    }
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Transaction {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    const calculateCostAmount = (): bigint => {
      if (this.isCurrentUserAdmin()) return BigInt(0)
      if (alias && brand) return this.registryConfig.unitPrice * BigInt(3)
      if (alias) return this.registryConfig.unitPrice * BigInt(2)
      return this.registryConfig.unitPrice
    }

    const buildArgs = (): BytesValue[] => {
      if (alias && brand) return [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias), BytesValue.fromHex(brand)]
      if (alias) return [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)]
      return [BytesValue.fromHex(txHash)]
    }

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'registerWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: calculateCostAmount(),
      arguments: buildArgs(),
    })
  }

  createWarpUnregisterTransaction(txHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)
    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'unregisterWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createWarpUpgradeTransaction(alias: string, txHash: string): Transaction {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'upgradeWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromUTF8(alias), BytesValue.fromHex(txHash)],
    })
  }

  createWarpAliasSetTransaction(txHash: string, alias: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'setWarpAlias',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  createWarpVerifyTransaction(txHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'verifyWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'transferOwnership',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash), new AddressValue(new Address(newOwner))],
    })
  }

  createBrandRegisterTransaction(txHash: string): Transaction {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'registerBrand',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  createWarpBrandingTransaction(warpHash: string, brandHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'brandWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(warpHash), BytesValue.fromHex(brandHash)],
    })
  }

  async getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: Brand | null }> {
    try {
      const cacheKey = CacheKey.RegistryInfo(this.config.env, alias)
      const cached = cache ? this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: Brand | null }>(cacheKey) : null
      if (cached) {
        WarpLogger.info(`WarpRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
        return cached
      }

      const contract = this.getRegistryContractAddress()
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
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: Brand | null }> {
    try {
      const cacheKey = CacheKey.RegistryInfo(this.config.env, hash)

      if (cache) {
        const cached = this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: Brand | null }>(cacheKey)
        if (cached) {
          WarpLogger.info(`WarpRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
          return cached
        }
      }

      const contract = this.getRegistryContractAddress()
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
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    try {
      const userWallet = user || this.config.user?.wallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = this.getRegistryContractAddress()
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserWarps', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [registryInfosRaw] = controller.parseQueryResponse(res)
      return registryInfosRaw.map(toTypedRegistryInfo)
    } catch (error) {
      return []
    }
  }

  async getUserBrands(user?: string): Promise<Brand[]> {
    try {
      const userWallet = user || this.config.user?.wallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = this.getRegistryContractAddress()
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserBrands', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [brandsRaw] = controller.parseQueryResponse(res)
      const brandHashes: string[] = brandsRaw.map((b: any) => b.toString('hex'))
      const brandCacheConfig: WarpCacheConfig = { ttl: 365 * 24 * 60 * 60 } // 1 year
      const brands = await Promise.all(brandHashes.map((hash) => this.fetchBrand(hash, brandCacheConfig)))
      return brands.filter((b) => b !== null) as Brand[]
    } catch (error) {
      return []
    }
  }

  async getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    const cacheListKey = CacheKey.ChainInfos(this.config.env)
    if (cache && cache.ttl) {
      const cachedList = this.cache.get<WarpChainInfo[]>(cacheListKey)
      if (cachedList) {
        WarpLogger.info('WarpRegistry (getChainInfos): ChainInfos found in cache')
        return cachedList
      }
    }

    const contract = this.getRegistryContractAddress()
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getChains', arguments: [] })
    const res = await controller.runQuery(query)
    const [chainInfosRaw] = controller.parseQueryResponse(res)
    const chainInfos = chainInfosRaw.map(toTypedChainInfo)

    if (cache && cache.ttl) {
      // Cache each individually for efficient reuse in getChainInfo
      for (const chainInfo of chainInfos) {
        this.cache.set(CacheKey.ChainInfo(this.config.env, chainInfo.chain), chainInfo, cache.ttl)
      }
      // Cache the full list
      this.cache.set(cacheListKey, chainInfos, cache.ttl)
    }

    return chainInfos
  }

  async getChainInfo(chain: WarpChain, cache?: WarpCacheConfig): Promise<WarpChainInfo | null> {
    try {
      const cacheKey = CacheKey.ChainInfo(this.config.env, chain)
      const cached = cache ? this.cache.get<WarpChainInfo>(cacheKey) : null
      if (cached) {
        WarpLogger.info(`WarpRegistry (getChainInfo): ChainInfo found in cache: ${chain}`)
        return cached
      }

      const contract = this.getRegistryContractAddress()
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getChain', arguments: [BytesValue.fromUTF8(chain)] })
      const res = await controller.runQuery(query)
      const [chainInfoRaw] = controller.parseQueryResponse(res)
      const chainInfo = chainInfoRaw ? toTypedChainInfo(chainInfoRaw) : null

      if (cache && cache.ttl && chainInfo) {
        this.cache.set(cacheKey, chainInfo, cache.ttl)
      }

      return chainInfo
    } catch (error) {
      return null
    }
  }

  async setChain(chain: WarpChain, info: WarpChainInfo): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'setChain',
      gasLimit: BigInt(5_000_000),
      arguments: [
        string(info.name),
        string(info.displayName),
        string(info.chainId),
        u32(info.blockTime),
        string(info.addressHrp),
        string(info.apiUrl),
        string(info.explorerUrl),
        string(info.nativeToken),
      ],
    })
  }

  async removeChain(chain: WarpChain): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: this.getRegistryContractAddress(),
      function: 'removeChain',
      gasLimit: BigInt(5_000_000),
      arguments: [string(chain)],
    })
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<Brand | null> {
    const cacheKey = CacheKey.Brand(this.config.env, hash)
    const cached = cache ? this.cache.get<Brand>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpRegistry (fetchBrand): Brand found in cache: ${hash}`)
      return cached
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
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
      return null
    }
  }

  getRegistryContractAddress(): Address {
    return Address.newFromBech32(this.config.registry?.contract || WarpConfig.Registry.Contract(this.config.env))
  }

  private async loadRegistryConfigs(): Promise<void> {
    const contract = this.getRegistryContractAddress()
    const controller = this.getController()
    const [configInfoRaw] = await controller.query({ contract, function: 'getConfig', arguments: [] })
    const configInfo = configInfoRaw ? toTypedConfigInfo(configInfoRaw) : null

    this.registryConfig = configInfo || { unitPrice: BigInt(0), admins: [] }
  }

  private getFactory(): SmartContractTransactionsFactory {
    const chain = getMainChainInfo(this.config)
    const config = new TransactionsFactoryConfig({ chainID: chain.chainId })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractTransactionsFactory({ config, abi })
  }

  private getController(): SmartContractController {
    const chainInfo = getMainChainInfo(this.config)
    const entrypoint = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const abi = AbiRegistry.create(RegistryAbi)
    return entrypoint.createSmartContractController(abi)
  }

  private isCurrentUserAdmin(): boolean {
    return !!this.config.user?.wallet && this.registryConfig.admins.includes(this.config.user.wallet)
  }
}
