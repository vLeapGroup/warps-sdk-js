import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpRegistry,
  WarpBrand,
  WarpCacheConfig,
  WarpChain,
  WarpChainInfo,
  WarpClientConfig,
  WarpLogger,
  WarpRegistryConfigInfo,
  WarpRegistryInfo,
} from '@vleap/warps'
import { getSuiApiUrl } from './config'
import { WarpSuiConstants } from './constants'
import { toRegistryMoveTarget, toTypedChainInfo, toTypedRegistryInfo } from './helpers/registry'

const cache: Record<string, any> = {}
const setCache = (key: string, value: any, ttl?: number) => {
  cache[key] = { value, expires: ttl ? Date.now() + ttl * 1000 : undefined }
}
const getCache = (key: string) => {
  const entry = cache[key]
  if (!entry) return null
  if (entry.expires && Date.now() > entry.expires) {
    delete cache[key]
    return null
  }
  return entry.value
}

const getRegistryObjectId = (config: WarpClientConfig): string => {
  if (typeof (config as any).registryObjectId === 'string') return (config as any).registryObjectId
  throw new Error('WarpSuiRegistry: registryObjectId must be provided in config')
}

export class WarpSuiRegistry implements AdapterWarpRegistry {
  private readonly client: SuiClient
  public registryConfig: { unitPrice: bigint; admins: string[] } = { unitPrice: BigInt(0), admins: [] }
  private userWallet: string | null

  constructor(private config: WarpClientConfig) {
    this.client = new SuiClient({ url: String(config.currentUrl) })
    this.userWallet = this.config.user?.wallets?.[WarpSuiConstants.ChainName] || null
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  getRegistryConfig(): WarpRegistryConfigInfo {
    return this.registryConfig
  }

  private async loadRegistryConfigs(): Promise<void> {
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_config'), [])
      const config = res && typeof res === 'object' ? (res as { unit_price?: string | number | bigint; admins?: string[] }) : {}
      this.registryConfig = {
        unitPrice: config.unit_price !== undefined ? BigInt(config.unit_price) : BigInt(0),
        admins: Array.isArray(config.admins) ? config.admins : [],
      }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry: Failed to load registry config', error)
      this.registryConfig = { unitPrice: BigInt(0), admins: [] }
    }
  }

  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Transaction {
    return this._createWarpRegisterTransaction(getRegistryObjectId(this.config), txHash, alias, brand)
  }
  private _createWarpRegisterTransaction(
    registryObjectId: string,
    txHash: string,
    alias?: string | null,
    brand?: string | null
  ): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        alias ? tx.pure.option('string', alias) : tx.pure.option('string', undefined),
        brand ? tx.pure.option('vector<u8>', Array.from(Buffer.from(brand, 'hex'))) : tx.pure.option('vector<u8>', undefined),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpUnregisterTransaction(txHash: string): Transaction {
    return this._createWarpUnregisterTransaction(getRegistryObjectId(this.config), txHash)
  }
  private _createWarpUnregisterTransaction(registryObjectId: string, txHash: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'unregister_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpUpgradeTransaction(alias: string, txHash: string): Transaction {
    return this._createWarpUpgradeTransaction(getRegistryObjectId(this.config), alias, txHash)
  }
  private _createWarpUpgradeTransaction(registryObjectId: string, alias: string, txHash: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'upgrade_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.string(alias),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpAliasSetTransaction(txHash: string, alias: string): Transaction {
    return this._createWarpAliasSetTransaction(getRegistryObjectId(this.config), txHash, alias)
  }
  private _createWarpAliasSetTransaction(registryObjectId: string, txHash: string, alias: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'set_warp_alias'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.string(alias),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpVerifyTransaction(txHash: string): Transaction {
    return this._createWarpVerifyTransaction(getRegistryObjectId(this.config), txHash)
  }
  private _createWarpVerifyTransaction(registryObjectId: string, txHash: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'verify_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Transaction {
    return this._createWarpTransferOwnershipTransaction(getRegistryObjectId(this.config), txHash, newOwner)
  }
  private _createWarpTransferOwnershipTransaction(registryObjectId: string, txHash: string, newOwner: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'transfer_ownership'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.address(newOwner),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createBrandRegisterTransaction(brand: string): Transaction {
    return this._createBrandRegisterTransaction(getRegistryObjectId(this.config), brand)
  }
  private _createBrandRegisterTransaction(registryObjectId: string, brand: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_brand'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(brand, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  createWarpBrandingTransaction(warpHash: string, brandHash: string): Transaction {
    return this._createWarpBrandingTransaction(getRegistryObjectId(this.config), warpHash, brandHash)
  }
  private _createWarpBrandingTransaction(registryObjectId: string, warpHash: string, brandHash: string): Transaction {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'brand_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(warpHash, 'hex'))),
        tx.pure.vector('u8', Array.from(Buffer.from(brandHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async getInfoByAlias(
    alias: string,
    cacheConfig?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    return this._getInfoByAlias(getRegistryObjectId(this.config), alias, cacheConfig)
  }
  private async _getInfoByAlias(
    registryObjectId: string,
    alias: string,
    cacheConfig?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = `sui:registry:info:alias:${alias}`
    const cached = cacheConfig ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
      return cached
    }
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_info_by_alias'), [registryObjectId, alias])
      const infoView = res ? res : null
      const registryInfo = infoView ? toTypedRegistryInfo(infoView) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand, cacheConfig) : null
      if (cacheConfig && cacheConfig.ttl) setCache(cacheKey, { registryInfo, brand }, cacheConfig.ttl)
      return { registryInfo, brand }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getInfoByAlias):', error)
      return { registryInfo: null, brand: null }
    }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    return this._getInfoByHash(getRegistryObjectId(this.config), hash, cache)
  }
  private async _getInfoByHash(
    registryObjectId: string,
    hash: string,
    cache?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = `sui:registry:info:hash:${hash}`
    const cached = cache ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
      return cached
    }
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_info_by_hash'), [
        registryObjectId,
        Array.from(Buffer.from(hash, 'hex')),
      ])
      const infoView = res ? res : null
      const registryInfo = infoView ? toTypedRegistryInfo(infoView) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand, cache) : null
      if (cache && cache.ttl) setCache(cacheKey, { registryInfo, brand }, cache.ttl)
      return { registryInfo, brand }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getInfoByHash):', error)
      return { registryInfo: null, brand: null }
    }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    return this._getUserWarpRegistryInfos(getRegistryObjectId(this.config), user)
  }
  private async _getUserWarpRegistryInfos(registryObjectId: string, user?: string): Promise<WarpRegistryInfo[]> {
    const cacheKey = `sui:registry:user:${user || this.userWallet}`
    const cached = getCache(cacheKey)
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getUserWarpRegistryInfos): RegistryInfos found in cache for user: ${user || this.userWallet}`)
      return cached
    }
    try {
      const userAddress = user || this.userWallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_user_warps'), [registryObjectId, userAddress])
      const registryInfos = Array.isArray(res) ? res.map(toTypedRegistryInfo) : []
      if (user) setCache(cacheKey, registryInfos)
      return registryInfos
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getUserWarpRegistryInfos):', error)
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    return this._getUserBrands(getRegistryObjectId(this.config), user)
  }
  private async _getUserBrands(registryObjectId: string, user?: string): Promise<WarpBrand[]> {
    const cacheKey = `sui:registry:user:brands:${user || this.userWallet}`
    const cached = getCache(cacheKey)
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getUserBrands): Brands found in cache for user: ${user || this.userWallet}`)
      return cached
    }
    try {
      const userAddress = user || this.userWallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_user_brands'), [registryObjectId, userAddress])
      if (!Array.isArray(res)) return []
      const brands = await Promise.all(res.map((hash: string) => this.fetchBrand(hash)))
      const filteredBrands = brands.filter((b) => b !== null) as WarpBrand[]
      if (user) setCache(cacheKey, filteredBrands)
      return filteredBrands
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getUserBrands):', error)
      return []
    }
  }

  async getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    return this._getChainInfos(getRegistryObjectId(this.config), cache)
  }
  private async _getChainInfos(registryObjectId: string, cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    const cacheKey = `sui:registry:chains`
    const cached = cache ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getChainInfos): Chains found in cache`)
      return cached
    }
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_chains'), [registryObjectId])
      const chainInfos = Array.isArray(res) ? res.map(toTypedChainInfo) : []
      if (cache && cache.ttl) setCache(cacheKey, chainInfos, cache.ttl)
      return chainInfos
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getChainInfos):', error)
      return []
    }
  }

  async getChainInfo(chain: WarpChain, _cache?: WarpCacheConfig): Promise<WarpChainInfo | null> {
    if (chain !== 'sui') return null
    return {
      name: 'sui',
      displayName: 'Sui',
      chainId: 'sui',
      blockTime: 0,
      addressHrp: 'sui',
      apiUrl: getSuiApiUrl(this.config.env),
      explorerUrl: 'https://suivision.xyz',
      nativeToken: 'SUI',
    }
  }

  async setChain(info: WarpChainInfo): Promise<any> {
    throw new Error('WarpSuiRegistry: setChain is not supported')
  }

  async removeChain(chain: WarpChain): Promise<any> {
    throw new Error('WarpSuiRegistry: removeChain is not supported')
  }

  async fetchBrand(hash: string, cacheConfig?: WarpCacheConfig): Promise<WarpBrand | null> {
    const cacheKey = `sui:brand:${hash}`
    const cached = cacheConfig ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (fetchBrand): Brand found in cache: ${hash}`)
      return cached
    }
    try {
      const tx = await this.client.getTransactionBlock({ digest: hash })
      if (!tx || !tx.effects) return null
      let brandData: any = null
      if (tx.events && Array.isArray(tx.events)) {
        for (const event of tx.events) {
          if (event.type && typeof event.type === 'string' && event.type.includes('BrandRegistered')) {
            try {
              brandData = event.parsedJson
              break
            } catch {}
          }
        }
      }
      if (!brandData && tx.objectChanges && Array.isArray(tx.objectChanges)) {
        for (const obj of tx.objectChanges) {
          if (obj.type === 'created' && obj.objectType && obj.objectType.includes('Brand')) {
            try {
              break
            } catch {}
          }
        }
      }
      if (!brandData) return null
      brandData.meta = {
        hash,
        creator: tx.transaction && tx.transaction.data && tx.transaction.data.sender ? tx.transaction.data.sender : undefined,
        createdAt: tx.timestampMs ? new Date(Number(tx.timestampMs)).toISOString() : undefined,
      }
      if (cacheConfig && cacheConfig.ttl) setCache(cacheKey, brandData, cacheConfig.ttl)
      return brandData as WarpBrand
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (fetchBrand):', error)
      return null
    }
  }
}
