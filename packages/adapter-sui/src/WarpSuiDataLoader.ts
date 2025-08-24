import { SuiClient } from '@mysten/sui/client'
import { AdapterWarpDataLoader, getProviderUrl, WarpChainAccount, WarpChainAsset, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { SuiLogoService } from './LogoService'

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

    return {
      chain: this.chain.name,
      address,
      balance: BigInt(balance.totalBalance),
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    // Get all balances (including non-SUI tokens)
    const allBalances = await this.client.getAllBalances({
      owner: address,
    })

    const assets: WarpChainAsset[] = []

    // Process each balance
    for (const balance of allBalances) {
      if (balance.coinType !== '0x2::sui::SUI') {
        // Skip native SUI as it's handled by getAccount
        try {
          // Try to get token metadata
          const tokenMetadata = await this.getTokenMetadata(balance.coinType)

          // Get enhanced logo URL using SuiLogoService
          const logoUrl = await SuiLogoService.getLogoUrl(balance.coinType)

          assets.push({
            chain: this.chain.name,
            identifier: balance.coinType,
            name: tokenMetadata.name,
            amount: BigInt(balance.totalBalance),
            decimals: tokenMetadata.decimals,
            logoUrl: logoUrl || tokenMetadata.logoUrl || '',
          })
        } catch (error) {
          // Fallback to basic info if metadata fetch fails
          const fallbackName = balance.coinType.split('::').pop() || balance.coinType
          const logoUrl = await SuiLogoService.getLogoUrl(balance.coinType)

          assets.push({
            chain: this.chain.name,
            identifier: balance.coinType,
            name: fallbackName,
            amount: BigInt(balance.totalBalance),
            decimals: 9, // Default to 9 decimals for Sui tokens
            logoUrl: logoUrl || '',
          })
        }
      }
    }

    return assets
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
