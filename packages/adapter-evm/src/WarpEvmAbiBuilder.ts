import { AdapterWarpAbiBuilder, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl } from './config'

export class WarpEvmAbiBuilder implements AdapterWarpAbiBuilder {
  constructor(private readonly config: WarpClientConfig) {}

  async createFromRaw(encoded: string): Promise<any> {
    try {
      const abi = JSON.parse(encoded)
      return abi
    } catch (error) {
      throw new Error(`Failed to decode ABI from raw data: ${error}`)
    }
  }

  async createFromTransaction(tx: ethers.TransactionResponse): Promise<any> {
    if (!tx.data || tx.data === '0x') {
      throw new Error('Transaction has no data')
    }

    try {
      const data = ethers.toUtf8String(tx.data)
      const abi = JSON.parse(data)
      return abi
    } catch (error) {
      throw new Error(`Failed to create ABI from transaction: ${error}`)
    }
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<any | null> {
    try {
      const provider = new ethers.JsonRpcProvider(getEvmApiUrl(this.config.env))
      const tx = await provider.getTransaction(hash)

      if (!tx) {
        return null
      }

      return await this.createFromTransaction(tx)
    } catch (error) {
      return null
    }
  }
}
