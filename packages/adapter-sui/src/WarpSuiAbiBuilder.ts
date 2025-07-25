import { SuiClient } from '@mysten/sui/client'
import { AdapterWarpAbiBuilder, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'

export class WarpSuiAbiBuilder implements AdapterWarpAbiBuilder {
  private readonly client: SuiClient

  constructor(private config: WarpClientConfig) {
    this.client = new SuiClient({ url: String(config.currentUrl) })
  }

  async createFromRaw(encoded: string): Promise<any> {
    return JSON.parse(encoded)
  }

  async createFromTransaction(tx: any): Promise<any> {
    // For SUI, we might need to extract ABI from transaction data
    // This is a placeholder implementation
    return this.createFromRaw(tx.data || '{}')
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<any | null> {
    try {
      const tx = await this.client.getTransactionBlock({ digest: hash })
      if (!tx) return null
      return this.createFromTransaction(tx)
    } catch (error) {
      return null
    }
  }

  async getModuleAbi(packageId: string, moduleName: string) {
    // Fetch the normalized Move module ABI from SUI
    return this.client.getNormalizedMoveModule({ package: packageId, module: moduleName })
  }

  async getFunctionAbi(packageId: string, moduleName: string, functionName: string) {
    // Fetch the normalized Move function ABI from SUI
    return this.client.getNormalizedMoveFunction({ package: packageId, module: moduleName, function: functionName })
  }
}
