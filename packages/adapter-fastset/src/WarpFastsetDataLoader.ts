import {
  AdapterWarpDataLoader,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import * as bech32 from 'bech32'
import { getConfiguredFastsetClient } from './helpers'
import { FastsetClient } from './sdk/FastsetClient'

export class WarpFastsetDataLoader implements AdapterWarpDataLoader {
  private client: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(config, chain)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const addressBytes = this.addressToBytes(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    return { chain: this.chain.name, address, balance: BigInt(parseInt(accountInfo.result?.balance ?? '0', 16)) }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const addressBytes = this.addressToBytes(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    const assets: WarpChainAsset[] = []
    console.log('accountInfo', accountInfo)
    const balance = BigInt(parseInt(accountInfo.result?.balance ?? '0', 16))
    if (balance > 0n) {
      assets.push({ ...this.chain.nativeToken, amount: balance })
    }

    for (const [tokenId, tokenBalance] of accountInfo.result?.token_balance ?? []) {
      const amount = BigInt(parseInt(tokenBalance, 16))
      if (amount > 0n) {
        const tokenInfo = await this.client.getTokenInfo([tokenId])
        const metadata = tokenInfo.requested_token_metadata[0]?.[1]

        assets.push({
          chain: this.chain.name,
          identifier: Buffer.from(tokenId).toString('hex'),
          symbol: metadata?.token_name || 'UNKNOWN',
          name: metadata?.token_name || 'Unknown Token',
          decimals: metadata?.decimals || 6,
          logoUrl: undefined,
          amount,
        })
      }
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    if (identifier === this.chain.nativeToken.identifier) {
      return this.chain.nativeToken
    }

    const tokenId = Buffer.from(identifier, 'hex')
    const tokenInfo = await this.client.getTokenInfo([Array.from(tokenId)])
    const metadata = tokenInfo.requested_token_metadata[0]?.[1]
    if (!metadata) return null

    return {
      chain: this.chain.name,
      identifier,
      symbol: metadata.token_name,
      name: metadata.token_name,
      decimals: metadata.decimals,
      logoUrl: undefined,
      amount: BigInt(metadata.total_supply),
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private addressToBytes(address: string): number[] {
    try {
      const decoded = bech32.bech32m.decode(address)
      return Array.from(bech32.bech32m.fromWords(decoded.words))
    } catch {
      try {
        const decoded = bech32.bech32.decode(address)
        return Array.from(bech32.bech32.fromWords(decoded.words))
      } catch {
        throw new Error(`Invalid FastSet address: ${address}`)
      }
    }
  }
}
