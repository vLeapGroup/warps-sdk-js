import { SuiClient } from '@mysten/sui/client'
import { AdapterWarpDataLoader, getProviderUrl, WarpChainAccount, WarpChainAsset, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

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
      address,
      balance: BigInt(balance.totalBalance),
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const coins = await this.client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    })

    const assets: WarpChainAsset[] = []

    // Group coins by type and sum amounts
    const coinMap = new Map<string, { amount: bigint; decimals: number }>()

    for (const coin of coins.data) {
      const coinType = coin.coinType
      const existing = coinMap.get(coinType)

      if (existing) {
        existing.amount += BigInt(coin.balance)
      } else {
        coinMap.set(coinType, {
          amount: BigInt(coin.balance),
          decimals: coin.coinObjectId ? 9 : 0, // SUI has 9 decimals, other tokens may vary
        })
      }
    }

    // Convert to WarpChainAsset format
    for (const [identifier, { amount, decimals }] of coinMap) {
      if (identifier !== '0x2::sui::SUI') {
        // Skip native SUI as it's handled by getAccount
        assets.push({
          identifier,
          name: identifier.split('::').pop() || identifier,
          amount,
          decimals,
          logoUrl: '',
        })
      }
    }

    return assets
  }
}
