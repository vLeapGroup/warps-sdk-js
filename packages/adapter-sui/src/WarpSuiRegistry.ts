import { AdapterWarpRegistry, WarpBrand, WarpCacheConfig, WarpChain, WarpChainInfo, WarpInitConfig, WarpRegistryInfo } from '@vleap/warps'

export class WarpSuiRegistry implements AdapterWarpRegistry {
  constructor(private config: WarpInitConfig) {}

  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): any {
    throw new Error('Not implemented')
  }
  createWarpUnregisterTransaction(txHash: string): any {
    throw new Error('Not implemented')
  }
  createWarpUpgradeTransaction(alias: string, txHash: string): any {
    throw new Error('Not implemented')
  }
  createWarpAliasSetTransaction(txHash: string, alias: string): any {
    throw new Error('Not implemented')
  }
  createWarpVerifyTransaction(txHash: string): any {
    throw new Error('Not implemented')
  }
  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): any {
    throw new Error('Not implemented')
  }
  createBrandRegisterTransaction(txHash: string): any {
    throw new Error('Not implemented')
  }
  createWarpBrandingTransaction(warpHash: string, brandHash: string): any {
    throw new Error('Not implemented')
  }
  async getInfoByAlias(
    alias: string,
    cache?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    throw new Error('Not implemented')
  }
  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    throw new Error('Not implemented')
  }
  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    throw new Error('Not implemented')
  }
  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    throw new Error('Not implemented')
  }
  async getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    throw new Error('Not implemented')
  }
  async getChainInfo(chain: WarpChain, cache?: WarpCacheConfig): Promise<WarpChainInfo | null> {
    throw new Error('Not implemented')
  }
  async setChain(info: WarpChainInfo): Promise<any> {
    throw new Error('Not implemented')
  }
  async removeChain(chain: WarpChain): Promise<any> {
    throw new Error('Not implemented')
  }
  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
    throw new Error('Not implemented')
  }
}
