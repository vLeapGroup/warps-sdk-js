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
  WarpRegistryInfo,
} from '@vleap/warps'
import { getSuiApiUrl } from './config'
import { WarpSuiConstants } from './constants'
import { toRegistryMoveTarget, toTypedChainInfo, toTypedRegistryInfo } from './helpers/registry'

const REGISTRY = WarpSuiConstants.Sui

// Simple in-memory cache for registry info, brands, and chain info
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

export class WarpSuiRegistry implements AdapterWarpRegistry {
  private readonly client: SuiClient
  public registryConfig: { unitPrice: bigint; admins: string[] } = { unitPrice: BigInt(0), admins: [] }

  constructor(private config: WarpClientConfig) {
    this.client = new SuiClient({ url: String(config.currentUrl) })
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
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
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_warp'),
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        alias ? tx.pure.option('string', alias) : tx.pure.option('string', undefined),
        brand ? tx.pure.option('vector<u8>', Array.from(Buffer.from(brand, 'hex'))) : tx.pure.option('vector<u8>', undefined),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpUnregisterTransaction(txHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::unregister_warp`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpUpgradeTransaction(alias: string, txHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::upgrade_warp`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.string(alias),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpAliasSetTransaction(txHash: string, alias: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::set_warp_alias`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.string(alias),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpVerifyTransaction(txHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::verify_warp`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::transfer_ownership`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.address(newOwner),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createBrandRegisterTransaction(brand: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::register_brand`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(brand, 'hex'))),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  createWarpBrandingTransaction(warpHash: string, brandHash: string): Transaction {
    if (!this.config.user?.wallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: `${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::brand_warp`,
      arguments: [
        tx.object(REGISTRY.RegistryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(warpHash, 'hex'))),
        tx.pure.vector('u8', Array.from(Buffer.from(brandHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.config.user.wallet),
      ],
    })
    return tx
  }

  async getInfoByAlias(
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
      const res = await this.client.call(`${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::get_info_by_alias`, [
        REGISTRY.RegistryObjectId,
        alias,
      ])
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
    const cacheKey = `sui:registry:info:hash:${hash}`
    const cached = cache ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
      return cached
    }
    try {
      const res = await this.client.call(`${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::get_info_by_hash`, [
        REGISTRY.RegistryObjectId,
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
    const cacheKey = `sui:registry:user:${user || this.config.user?.wallet}`
    const cached = getCache(cacheKey)
    if (cached) {
      WarpLogger.info(
        `WarpSuiRegistry (getUserWarpRegistryInfos): RegistryInfos found in cache for user: ${user || this.config.user?.wallet}`
      )
      return cached
    }
    try {
      const userAddress = user || this.config.user?.wallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(`${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::get_user_warps`, [
        REGISTRY.RegistryObjectId,
        userAddress,
      ])
      const registryInfos = Array.isArray(res) ? res.map(toTypedRegistryInfo) : []
      if (user) setCache(cacheKey, registryInfos)
      return registryInfos
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getUserWarpRegistryInfos):', error)
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    const cacheKey = `sui:registry:user:brands:${user || this.config.user?.wallet}`
    const cached = getCache(cacheKey)
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getUserBrands): Brands found in cache for user: ${user || this.config.user?.wallet}`)
      return cached
    }
    try {
      const userAddress = user || this.config.user?.wallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(`${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::get_user_brands`, [
        REGISTRY.RegistryObjectId,
        userAddress,
      ])
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
    const cacheKey = `sui:registry:chains`
    const cached = cache ? getCache(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getChainInfos): Chains found in cache`)
      return cached
    }
    try {
      const res = await this.client.call(`${REGISTRY.RegistryPackageId}::${REGISTRY.RegistryModule}::get_chains`, [
        REGISTRY.RegistryObjectId,
      ])
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
      // Sui: fetch transaction by hash and parse data as WarpBrand
      const tx = await this.client.getTransactionBlock({ digest: hash })
      if (!tx || !tx.effects) return null
      // Sui: try to extract brand from transaction's events or object changes
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
              // No 'fields' or 'data' property available, skip
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
