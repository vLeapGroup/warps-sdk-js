// @ts-ignore - Sui SDK has ESM compatibility issues but this is production code
import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpDataLoader,
  CacheTtl,
  getProviderUrl,
  WarpCache,
  WarpCacheKey,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { findKnownTokenById } from './tokens'

export class WarpSuiDataLoader implements AdapterWarpDataLoader {
  private client: SuiClient
  private cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: apiUrl })
    this.cache = new WarpCache(config.cache?.type)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const balance = await this.client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    })

    return { chain: this.chain.name, address, balance: BigInt(balance.totalBalance) }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const allBalances = await this.client.getAllBalances({ owner: address })

    const suiBalance = allBalances.find((balance: any) => balance.coinType === '0x2::sui::SUI')
    const tokenBalances = allBalances.filter((balance: any) => balance.coinType !== '0x2::sui::SUI' && BigInt(balance.totalBalance) > 0n)

    const assets: WarpChainAsset[] = []
    if (suiBalance && BigInt(suiBalance.totalBalance) > 0n) {
      assets.push({ ...this.chain.nativeToken, amount: BigInt(suiBalance.totalBalance) })
    }

    if (tokenBalances.length > 0) {
      const tokenAssets = await Promise.all(tokenBalances.map((balance: any) => this.getAsset(balance.coinType)))
      assets.push(
        ...tokenAssets
          .filter((asset: any) => asset !== null)
          .map((asset: any) => ({
            ...asset,
            amount: BigInt(tokenBalances.find((b: any) => b.coinType === asset.identifier)?.totalBalance || 0),
          }))
      )
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
    const cachedAsset = this.cache.get<WarpChainAsset>(cacheKey)
    if (cachedAsset) return cachedAsset

    const local = findKnownTokenById(identifier)
    if (local)
      return {
        chain: this.chain.name,
        identifier,
        name: local.name,
        symbol: local.symbol,
        amount: 0n,
        decimals: local.decimals,
        logoUrl: local.logoUrl,
      }

    try {
      const metadata = await this.client.getCoinMetadata({ coinType: identifier })
      const asset: WarpChainAsset = {
        chain: this.chain.name,
        identifier,
        name: metadata?.name || identifier.split('::').pop() || identifier,
        symbol: metadata?.symbol || identifier.split('::').pop() || identifier,
        amount: 0n,
        decimals: metadata?.decimals || 9,
        logoUrl: metadata?.iconUrl || '',
      }
      this.cache.set(cacheKey, asset, CacheTtl.OneHour)
      return asset
    } catch (error) {
      // If token metadata is not found, return null
      return null
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }
}
