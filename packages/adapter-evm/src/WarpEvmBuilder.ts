import { BaseWarpBuilder, CombinedWarpBuilder, Warp, WarpCacheConfig, WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl } from './config'

export class WarpEvmBuilder implements CombinedWarpBuilder {
  private warp: Partial<Warp> = {}
  private actions: any[] = []

  constructor(private readonly config: WarpClientConfig) {}

  async createFromRaw(encoded: string): Promise<Warp> {
    try {
      const decoded = JSON.parse(encoded)
      return decoded as Warp
    } catch (error) {
      throw new Error(`Failed to decode warp from raw data: ${error}`)
    }
  }

  setTitle(title: string): BaseWarpBuilder {
    this.warp.title = title
    return this
  }

  setDescription(description: string): BaseWarpBuilder {
    this.warp.description = description
    return this
  }

  setPreview(preview: string): BaseWarpBuilder {
    this.warp.preview = preview
    return this
  }

  setActions(actions: any[]): BaseWarpBuilder {
    this.actions = actions
    return this
  }

  addAction(action: any): BaseWarpBuilder {
    this.actions.push(action)
    return this
  }

  async build(): Promise<Warp> {
    if (!this.warp.title) {
      throw new Error('Warp title is required')
    }

    return {
      protocol: 'warp',
      name: this.warp.name || 'evm-warp',
      title: this.warp.title,
      description: this.warp.description || null,
      preview: this.warp.preview || null,
      actions: this.actions,
      meta: {
        chain: 'evm',
        hash: ethers.keccak256(ethers.toUtf8Bytes(this.warp.title)),
        creator: this.config.user?.wallets?.evm || '',
        createdAt: new Date().toISOString(),
      },
    } as Warp
  }

  createInscriptionTransaction(warp: Warp): ethers.TransactionRequest {
    const warpData = JSON.stringify(warp)
    const data = ethers.toUtf8Bytes(warpData)

    return {
      data: ethers.hexlify(data),
    }
  }

  async createFromTransaction(tx: ethers.TransactionResponse, validate?: boolean): Promise<Warp> {
    if (!tx.data || tx.data === '0x') {
      throw new Error('Transaction has no data')
    }

    try {
      const data = ethers.toUtf8String(tx.data)
      const warp = JSON.parse(data)

      if (validate) {
        if (!warp.protocol || warp.protocol !== 'warp') {
          throw new Error('Invalid warp protocol')
        }
        if (!warp.title) {
          throw new Error('Warp title is required')
        }
      }

      return warp as Warp
    } catch (error) {
      throw new Error(`Failed to create warp from transaction: ${error}`)
    }
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
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
