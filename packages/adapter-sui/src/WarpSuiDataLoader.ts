import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpDataLoader,
  getProviderUrl,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { SuiLogoService } from './LogoService'
import { getKnownTokensForChain } from './tokens'

export class WarpSuiDataLoader implements AdapterWarpDataLoader {
  private client: SuiClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: apiUrl })
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

    const knownTokens = getKnownTokensForChain(this.chain.name, this.config.env)

    const suiBalance = allBalances.find((balance) => balance.coinType === '0x2::sui::SUI')
    const tokenBalances = allBalances.filter((balance) => balance.coinType !== '0x2::sui::SUI' && BigInt(balance.totalBalance) > 0n)

    const assets: WarpChainAsset[] = []
    if (suiBalance && BigInt(suiBalance.totalBalance) > 0n) {
      assets.push({ ...this.chain.nativeToken, amount: BigInt(suiBalance.totalBalance) })
    }

    // Process other tokens concurrently
    if (tokenBalances.length > 0) {
      // Create concurrent requests for metadata and logos
      const tokenProcessingPromises = tokenBalances.map(async (balance) => {
        // Check if token is in known tokens first
        const knownToken = knownTokens.find((token) => token.id === balance.coinType)

        if (knownToken) {
          // Use known token metadata - much faster!
          return {
            chain: this.chain.name,
            identifier: balance.coinType,
            name: knownToken.name,
            amount: BigInt(balance.totalBalance),
            decimals: knownToken.decimals,
            logoUrl: knownToken.logoUrl,
          }
        } else {
          // Fallback to API metadata for unknown tokens
          try {
            const metadata = await this.getTokenMetadata(balance.coinType)
            const logoUrl = await SuiLogoService.getLogoUrl(balance.coinType)

            return {
              chain: this.chain.name,
              identifier: balance.coinType,
              name: metadata.name,
              amount: BigInt(balance.totalBalance),
              decimals: metadata.decimals,
              logoUrl: logoUrl || metadata.logoUrl || '',
            }
          } catch (error) {
            // Final fallback
            const fallbackName = balance.coinType.split('::').pop() || balance.coinType
            const logoUrl = await SuiLogoService.getLogoUrl(balance.coinType).catch(() => '')

            return {
              chain: this.chain.name,
              identifier: balance.coinType,
              name: fallbackName,
              amount: BigInt(balance.totalBalance),
              decimals: 9, // Default to 9 decimals for Sui tokens
              logoUrl: logoUrl || '',
            }
          }
        }
      })

      // Wait for ALL concurrent requests to complete
      const tokenAssets = await Promise.all(tokenProcessingPromises)
      assets.push(...tokenAssets)
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    return null
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private async getTokenMetadata(identifier: string): Promise<{ name: string; decimals: number; logoUrl: string }> {
    try {
      // Try to get token metadata from Sui API
      const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
      const response = await fetch(`${apiUrl}/objects/${identifier}`)
      if (response.ok) {
        const data = await response.json()
        // Extract metadata from the object
        return {
          name: data.data?.display?.name || identifier.split('::').pop() || identifier,
          decimals: data.data?.display?.decimals || 9,
          logoUrl: data.data?.display?.icon_url || '',
        }
      }
    } catch (error) {
      // Ignore errors and return fallback
    }

    // Fallback metadata
    return {
      name: identifier.split('::').pop() || identifier,
      decimals: 9,
      logoUrl: '',
    }
  }
}
