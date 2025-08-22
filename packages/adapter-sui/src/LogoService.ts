const KNOWN_TOKEN_LOGOS: Record<string, string> = {
  '0x2::sui::SUI': 'https://assets.coingecko.com/coins/images/26375/small/sui-logo.png',
  '::usdc::USDC': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  '::usdt::USDT': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  '::weth::WETH': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  '::wbtc::WBTC': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  '::dai::DAI': 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
  '::busd::BUSD': 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',
  '::ocean::OCEAN': 'https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.png',
  '::eth::ETH': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
}

const logoCache = new Map<string, string>()

export class SuiLogoService {
  static async getLogoUrl(identifier: string): Promise<string> {
    if (logoCache.has(identifier)) {
      return logoCache.get(identifier)!
    }

    if (KNOWN_TOKEN_LOGOS[identifier]) {
      const logoUrl = KNOWN_TOKEN_LOGOS[identifier]
      logoCache.set(identifier, logoUrl)
      return logoUrl
    }

    if (identifier.includes('::')) {
      const parts = identifier.split('::')
      if (parts.length >= 3) {
        const partialKey = `::${parts[parts.length - 2]}::${parts[parts.length - 1]}`
        if (KNOWN_TOKEN_LOGOS[partialKey]) {
          const logoUrl = KNOWN_TOKEN_LOGOS[partialKey]
          logoCache.set(identifier, logoUrl)
          return logoUrl
        }
      }
    }

    let logoUrl = ''

    try {
      logoUrl = await this.fetchFromSuiAPI(identifier)
    } catch (error) {}

    logoCache.set(identifier, logoUrl)
    return logoUrl
  }

  private static async fetchFromSuiAPI(identifier: string): Promise<string> {
    try {
      const testnetResponse = await fetch(`https://fullnode.testnet.sui.io/objects/${identifier}`)
      if (testnetResponse.ok) {
        const data = await testnetResponse.json()
        if (data.data?.display?.icon_url) {
          return data.data.display.icon_url
        }
      }

      const mainnetResponse = await fetch(`https://fullnode.mainnet.sui.io/objects/${identifier}`)
      if (mainnetResponse.ok) {
        const data = await mainnetResponse.json()
        if (data.data?.display?.icon_url) {
          return data.data.display.icon_url
        }
      }
    } catch (error) {}

    return ''
  }

  static clearCache(): void {
    logoCache.clear()
  }

  static getCacheSize(): number {
    return logoCache.size
  }
}
