import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { AdapterWarpBuilder, Warp, WarpBuilder, WarpCache, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'
import { WarpSuiConstants } from './constants'
import { toRegistryMoveTarget } from './helpers/registry'

export class WarpSuiBuilder extends WarpBuilder implements AdapterWarpBuilder {
  private cache: WarpCache
  private client: SuiClient
  private userWallet: string | null

  constructor(protected readonly config: WarpClientConfig) {
    super(config)
    this.cache = new WarpCache(config.cache?.type)
    this.client = new SuiClient({ url: String(config.currentUrl) })
    this.userWallet = this.config.user?.wallets?.[WarpSuiConstants.ChainName] || null
  }

  createInscriptionTransaction(warp: Warp, registryObjectId?: string): Transaction {
    if (!registryObjectId) throw new Error('WarpSuiBuilder: registryObjectId is required')
    if (!this.userWallet) throw new Error('WarpSuiBuilder: user address not set')
    if (!warp.meta || !warp.meta.hash) throw new Error('WarpSuiBuilder: warp.meta.hash is required')
    const hashBytes = Array.from(Buffer.from(warp.meta.hash, 'hex'))
    const alias = (warp as any).meta?.alias ?? undefined
    const brandBytes = (warp as any).meta?.brand ? Array.from(Buffer.from((warp as any).meta.brand, 'hex')) : undefined
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', hashBytes),
        alias ? tx.pure.option('string', alias) : tx.pure.option('string', undefined),
        brandBytes ? tx.pure.option('vector<u8>', brandBytes) : tx.pure.option('vector<u8>', undefined),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createFromRaw(info: any): Promise<Warp> {
    const hash = info.hash ? (Buffer.isBuffer(info.hash) ? info.hash.toString('hex') : Buffer.from(info.hash).toString('hex')) : ''
    const alias = info.alias ? (Buffer.isBuffer(info.alias) ? info.alias.toString() : Buffer.from(info.alias).toString()) : null
    const brand = info.brand ? (Buffer.isBuffer(info.brand) ? info.brand.toString('hex') : Buffer.from(info.brand).toString('hex')) : null
    const creator = info.owner ?? ''
    const createdAt = info.created_at ? new Date(Number(info.created_at)).toISOString() : ''
    const warp: Warp = {
      meta: {
        chain: WarpSuiConstants.ChainName,
        hash,
        alias,
        creator,
        createdAt,
        brand,
      },
      ...info,
    }
    return warp
  }

  async createFromNetwork(id: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const cacheKey = `sui:warp:${id}`
    if (cache) {
      const cached = this.cache.get<Warp>(cacheKey)
      if (cached) return cached
    }
    try {
      const info: any = await this.client.call(`${toRegistryMoveTarget(this.config.env, 'get_info_by_hash')}`, [
        id,
        Array.from(Buffer.from(id, 'hex')),
      ])
      if (!info || !Object.prototype.hasOwnProperty.call(info, 'hash') || !info.hash) return null
      const warp = this.createFromRaw(info)
      if (cache && cache.ttl && warp) {
        this.cache.set(cacheKey, warp, cache.ttl)
      }
      return warp
    } catch {
      return null
    }
  }

  async createFromTransaction(info: any): Promise<Warp> {
    return this.createFromRaw(info)
  }

  async createFromTransactionHash(id: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    return this.createFromNetwork(id, cache)
  }
}
