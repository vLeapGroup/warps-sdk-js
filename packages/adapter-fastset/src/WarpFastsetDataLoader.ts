import {
  AdapterWarpDataLoader,
  getWarpChainAssetLogoUrl,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { getConfiguredFastsetClient, hexToUint8Array } from './helpers'
import { FastsetClient } from './sdk/FastsetClient'
import { findKnownTokenById, findKnownTokenBySymbol } from './tokens'

export class WarpFastsetDataLoader implements AdapterWarpDataLoader {
  private client: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(config, chain)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const addressBytes = FastsetClient.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    return { chain: this.chain.name, address, balance: BigInt(parseInt(accountInfo.result?.balance ?? '0', 16)) }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const addressBytes = FastsetClient.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    const assets: WarpChainAsset[] = []
    const balance = BigInt(parseInt(accountInfo.result?.balance ?? '0', 16))
    if (balance > 0n) {
      assets.push({ ...this.chain.nativeToken, amount: balance })
    }

    for (const [tokenId, tokenBalance] of accountInfo.result?.token_balance ?? []) {
      const amount = BigInt(parseInt(tokenBalance, 16))

      if (amount > 0n) {
        const assetInfo = await this.getAssetInfo(Buffer.from(tokenId).toString('hex'))
        if (!assetInfo) continue

        assets.push({
          chain: this.chain.name,
          identifier: Buffer.from(tokenId).toString('hex'),
          symbol: assetInfo.symbol,
          name: assetInfo.name,
          decimals: assetInfo.decimals,
          logoUrl: assetInfo.logoUrl,
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

    const assetInfo = await this.getAssetInfo(identifier)

    if (!assetInfo) {
      return null
    }

    return {
      chain: this.chain.name,
      identifier,
      symbol: assetInfo.symbol,
      name: assetInfo.name,
      decimals: assetInfo.decimals,
      logoUrl: assetInfo.logoUrl,
      amount: 0n,
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private async getAssetInfo(identifier: string): Promise<WarpChainAsset | null> {
    const knownToken = findKnownTokenById(identifier, this.config.env) || findKnownTokenBySymbol(identifier, this.config.env)

    if (knownToken) {
      return knownToken
    }

    const tokenInfo = await this.client.getTokenInfo(hexToUint8Array(identifier))
    const metadata = tokenInfo.result?.requested_token_metadata[0]?.[1]

    if (metadata) {
      return {
        chain: this.chain.name,
        identifier,
        symbol: metadata.token_name,
        name: metadata.token_name,
        decimals: metadata.decimals,
        logoUrl: null,
      }
    }

    return null
  }
}
