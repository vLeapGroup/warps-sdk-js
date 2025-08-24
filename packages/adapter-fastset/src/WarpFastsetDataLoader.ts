import {
  AdapterWarpDataLoader,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { FastsetClient } from './sdk'

export class WarpFastsetDataLoader implements AdapterWarpDataLoader {
  private readonly fastsetClient: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const validatorUrl = this.chain.defaultApiUrl
    const proxyUrl = this.chain.defaultApiUrl
    this.fastsetClient = new FastsetClient({
      validatorUrl,
      proxyUrl,
    })
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
      const addressBytes = this.fromBase64(address)
      const accountInfo = await this.fastsetClient.getAccountInfo(addressBytes)

      if (!accountInfo) {
        return {
          chain: this.chain.name,
          address,
          balance: BigInt(0),
        }
      }

      return {
        chain: this.chain.name,
        address,
        balance: BigInt(accountInfo.balance || '0'),
      }
    } catch (error) {
      return {
        chain: this.chain.name,
        address,
        balance: BigInt(0),
      }
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      const account = await this.getAccount(address)

      if (account.balance > 0) {
        return [
          {
            chain: this.chain.name,
            identifier: this.chain.nativeToken?.identifier || 'SET',
            name: this.chain.nativeToken?.name || 'SET',
            decimals: this.chain.nativeToken?.decimals || 18,
            amount: account.balance,
            logoUrl: this.chain.nativeToken?.logoUrl,
          },
        ]
      }

      return []
    } catch (error) {
      return []
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  }
}
