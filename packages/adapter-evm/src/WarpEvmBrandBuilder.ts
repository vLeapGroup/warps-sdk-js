import { AdapterWarpBrandBuilder, WarpBrand, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl } from './config'

export class WarpEvmBrandBuilder implements AdapterWarpBrandBuilder {
  constructor(private readonly config: WarpClientConfig) {}

  createInscriptionTransaction(brand: WarpBrand): ethers.TransactionRequest {
    const brandData = JSON.stringify(brand)
    const data = ethers.toUtf8Bytes(brandData)

    return {
      data: ethers.hexlify(data),
    }
  }

  async createFromTransaction(tx: ethers.TransactionResponse, validate?: boolean): Promise<WarpBrand> {
    if (!tx.data || tx.data === '0x') {
      throw new Error('Transaction has no data')
    }

    try {
      const data = ethers.toUtf8String(tx.data)
      const brand = JSON.parse(data)

      if (validate) {
        if (!brand.hash) {
          throw new Error('Brand hash is required')
        }
        if (!brand.owner) {
          throw new Error('Brand owner is required')
        }
      }

      return brand as WarpBrand
    } catch (error) {
      throw new Error(`Failed to create brand from transaction: ${error}`)
    }
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
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
