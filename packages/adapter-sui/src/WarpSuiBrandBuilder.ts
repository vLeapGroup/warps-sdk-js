import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { AdapterWarpBrandBuilder, getProviderConfig, WarpBrand, WarpCacheConfig, WarpChainInfo, WarpClientConfig } from '@joai/warps'

export class WarpSuiBrandBuilder implements AdapterWarpBrandBuilder {
  private readonly client: SuiClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
  }

  createInscriptionTransaction(brand: WarpBrand): Transaction {
    // For SUI, brand inscription would typically involve a Move call
    // This is a placeholder implementation
    const tx = new Transaction()
    // Add brand inscription logic here
    return tx
  }

  async createFromRaw(encoded: string): Promise<WarpBrand> {
    return JSON.parse(encoded) as WarpBrand
  }

  async createFromTransaction(tx: any, validate?: boolean): Promise<WarpBrand> {
    // For SUI, extract brand data from transaction
    // This is a placeholder implementation
    return this.createFromRaw(tx.data || '{}')
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
    try {
      const tx = await this.client.getTransactionBlock({ digest: hash })
      if (!tx) return null
      return this.createFromTransaction(tx, false)
    } catch (error) {
      return null
    }
  }
}
