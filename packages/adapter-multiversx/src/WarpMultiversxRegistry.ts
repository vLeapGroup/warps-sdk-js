import {
  AbiRegistry,
  Address,
  AddressValue,
  BytesValue,
  SmartContractController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core'
import {
  AdapterWarpRegistry,
  getMainChainInfo,
  toTypedChainInfo,
  WarpBrand,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpChain,
  WarpChainInfo,
  WarpClientConfig,
  WarpLogger,
  WarpRegistryConfigInfo,
  WarpRegistryInfo,
} from '@vleap/warps'
import RegistryAbi from './abis/registry.abi.json'
import { getMultiversxRegistryAddress } from './config'
import { WarpMultiversxConstants } from './constants'
import { toTypedConfigInfo, toTypedRegistryInfo } from './helpers/registry'
import { string_value, u32_value } from './utils.codec'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

export class WarpMultiversxRegistry implements AdapterWarpRegistry {
  private cache: WarpCache
  private userWallet: string | null
  public registryConfig: WarpRegistryConfigInfo

  constructor(private config: WarpClientConfig) {
    this.cache = new WarpCache(config.cache?.type)
    this.registryConfig = {
      unitPrice: BigInt(0),
      admins: [],
    }
    this.userWallet = this.config.user?.wallets?.[WarpMultiversxConstants.ChainName] || null
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  getRegistryConfig(): WarpRegistryConfigInfo {
    return this.registryConfig
  }

  async createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

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

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'registerWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: calculateCostAmount(),
      arguments: buildArgs(),
    })
  }

  async createWarpUnregisterTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)
    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'unregisterWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpUpgradeTransaction(alias: string, txHash: string): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'upgradeWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromUTF8(alias), BytesValue.fromHex(txHash)],
    })
  }

  async createWarpAliasSetTransaction(txHash: string, alias: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'setWarpAlias',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  async createWarpVerifyTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'verifyWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'transferOwnership',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash), new AddressValue(new Address(newOwner))],
    })
  }

  async createBrandRegisterTransaction(txHash: string): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'registerBrand',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'brandWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(warpHash), BytesValue.fromHex(brandHash)],
    })
  }

  async getInfoByAlias(
    alias: string,
    cache?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    try {
      const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, alias)
      const cached = cache ? this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey) : null
      if (cached) {
        WarpLogger.info(`WarpRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
        return cached
      }

      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
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

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    try {
      const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, hash)

      if (cache) {
        const cached = this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey)
        if (cached) {
          WarpLogger.info(`WarpRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
          return cached
        }
      }

      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
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
      const userWallet = user || this.userWallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserWarps', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [registryInfosRaw] = controller.parseQueryResponse(res)
      return registryInfosRaw.map(toTypedRegistryInfo)
    } catch (error) {
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    try {
      const userWallet = user || this.userWallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserBrands', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [brandsRaw] = controller.parseQueryResponse(res)
      const brandHashes: string[] = brandsRaw.map((b: any) => b.toString('hex'))
      const brandCacheConfig: WarpCacheConfig = { ttl: 365 * 24 * 60 * 60 } // 1 year
      const brands = await Promise.all(brandHashes.map((hash) => this.fetchBrand(hash, brandCacheConfig)))
      return brands.filter((b) => b !== null) as WarpBrand[]
    } catch (error) {
      return []
    }
  }

  async getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    const cacheListKey = WarpCacheKey.ChainInfos(this.config.env)
    if (cache && cache.ttl) {
      const cachedList = this.cache.get<WarpChainInfo[]>(cacheListKey)
      if (cachedList) {
        WarpLogger.info('WarpRegistry (getChainInfos): ChainInfos found in cache')
        return cachedList
      }
    }

    const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getChains', arguments: [] })
    const res = await controller.runQuery(query)
    const [chainInfosRaw] = controller.parseQueryResponse(res)
    const chainInfos = chainInfosRaw.map(toTypedChainInfo)

    if (cache && cache.ttl) {
      // Cache each individually for efficient reuse in getChainInfo
      for (const chainInfo of chainInfos) {
        this.cache.set(WarpCacheKey.ChainInfo(this.config.env, chainInfo.chain), chainInfo, cache.ttl)
      }
      // Cache the full list
      this.cache.set(cacheListKey, chainInfos, cache.ttl)
    }

    return chainInfos
  }

  async getChainInfo(chain: WarpChain, cache?: WarpCacheConfig): Promise<WarpChainInfo | null> {
    try {
      const cacheKey = WarpCacheKey.ChainInfo(this.config.env, chain)
      const cached = cache ? this.cache.get<WarpChainInfo>(cacheKey) : null
      if (cached) {
        WarpLogger.info(`WarpRegistry (getChainInfo): ChainInfo found in cache: ${chain}`)
        return cached
      }

      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
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

  async setChain(info: WarpChainInfo): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'setChain',
      gasLimit: BigInt(10_000_000),
      arguments: [
        string_value(info.name),
        string_value(info.displayName),
        string_value(info.chainId),
        u32_value(info.blockTime),
        string_value(info.addressHrp),
        string_value(info.apiUrl),
        string_value(info.explorerUrl),
        string_value(info.nativeToken),
      ],
    })
  }

  async removeChain(chain: WarpChain): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'removeChain',
      gasLimit: BigInt(10_000_000),
      arguments: [string_value(chain)],
    })
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
    const cacheKey = WarpCacheKey.Brand(this.config.env, hash)
    const cached = cache ? this.cache.get<WarpBrand>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpRegistry (fetchBrand): Brand found in cache: ${hash}`)
      return cached
    }

    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const brand = JSON.parse(tx.data.toString()) as WarpBrand

      brand.meta = {
        hash: tx.hash,
        creator: tx.sender.toBech32(),
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

  private async loadRegistryConfigs(): Promise<void> {
    const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
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
    const entrypoint = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
    const abi = AbiRegistry.create(RegistryAbi)
    return entrypoint.createSmartContractController(abi)
  }

  private isCurrentUserAdmin(): boolean {
    return !!this.userWallet && this.registryConfig.admins.includes(this.userWallet)
  }
}
