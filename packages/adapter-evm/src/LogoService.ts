interface TokenInfo {
  name?: string
  symbol?: string
  logoURI?: string
  decimals?: number
}

interface TokenListResponse {
  tokens: Array<{
    chainId: number
    address: string
    name: string
    symbol: string
    decimals: number
    logoURI?: string
  }>
}

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
}

const FALLBACK_LOGOS: Record<string, Record<string, string>> = {
  ethereum: {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
  },
  arbitrum: {
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  base: {
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    '0x4200000000000000000000000000000000000006': 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    '0x808456652fdb597867f38412077A9182bf77359F': 'https://assets.coingecko.com/coins/images/26045/standard/euro.png',
    '0xcbB7C0006F23900c38EB856149F799620fcb8A4a': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
}

const TOKEN_LISTS = [
  'https://tokens.uniswap.org',
  'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json',
  'https://tokens.1inch.io',
]

const logoCache = new Map<string, string>()
const tokenInfoCache = new Map<string, TokenInfo>()
const tokenListCache = new Map<string, TokenInfo>()

export class EvmLogoService {
  static async getTokenInfo(chainName: string, tokenAddress: string): Promise<TokenInfo> {
    const cacheKey = `${chainName}:${tokenAddress.toLowerCase()}`

    if (tokenInfoCache.has(cacheKey)) {
      return tokenInfoCache.get(cacheKey)!
    }

    let tokenInfo: TokenInfo = {}

    try {
      tokenInfo = await this.fetchFromTokenLists(chainName, tokenAddress)
    } catch (error) {}

    if (!tokenInfo.logoURI) {
      try {
        tokenInfo = { ...tokenInfo, ...(await this.fetchFromDefiLlama(chainName, tokenAddress)) }
      } catch (error) {}
    }

    tokenInfoCache.set(cacheKey, tokenInfo)
    return tokenInfo
  }

  static async getLogoUrl(chainName: string, tokenAddress: string, tokenName?: string, tokenSymbol?: string): Promise<string> {
    const cacheKey = `${chainName}:${tokenAddress.toLowerCase()}`

    if (logoCache.has(cacheKey)) {
      return logoCache.get(cacheKey)!
    }

    let logoUrl = ''

    const fallbackLogos = FALLBACK_LOGOS[chainName]
    if (fallbackLogos && fallbackLogos[tokenAddress]) {
      logoUrl = fallbackLogos[tokenAddress]
    } else {
      const tokenInfo = await this.getTokenInfo(chainName, tokenAddress)
      logoUrl = tokenInfo.logoURI || ''

      if (!logoUrl && (tokenSymbol || tokenName)) {
        try {
          logoUrl = await this.fetchFromTrustWallet(chainName, tokenAddress)
        } catch (error) {}
      }
    }

    logoCache.set(cacheKey, logoUrl)
    return logoUrl
  }

  private static async fetchFromTokenLists(chainName: string, tokenAddress: string): Promise<TokenInfo> {
    const chainId = CHAIN_IDS[chainName]
    if (!chainId) return {}

    const normalizedAddress = tokenAddress.toLowerCase()

    if (tokenListCache.has(`${chainId}:${normalizedAddress}`)) {
      return tokenListCache.get(`${chainId}:${normalizedAddress}`) || {}
    }

    for (const tokenListUrl of TOKEN_LISTS) {
      try {
        const response = await fetch(tokenListUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data: TokenListResponse = await response.json()

          const token = data.tokens.find((t) => t.chainId === chainId && t.address.toLowerCase() === normalizedAddress)

          if (token) {
            const tokenInfo: TokenInfo = {
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logoURI: token.logoURI,
            }
            tokenListCache.set(`${chainId}:${normalizedAddress}`, tokenInfo)
            return tokenInfo
          }
        }
      } catch (error) {
        continue
      }
    }

    return {}
  }

  private static async fetchFromDefiLlama(chainName: string, tokenAddress: string): Promise<TokenInfo> {
    try {
      const chainMapping: Record<string, string> = {
        ethereum: 'ethereum',
        arbitrum: 'arbitrum',
        base: 'base',
      }

      const chain = chainMapping[chainName]
      if (!chain) return {}

      const response = await fetch(`https://coins.llama.fi/prices/current/${chain}:${tokenAddress}`, { signal: AbortSignal.timeout(5000) })

      if (response.ok) {
        const data = await response.json()
        const coinData = data.coins?.[`${chain}:${tokenAddress}`]

        if (coinData) {
          return {
            symbol: coinData.symbol,
            logoURI: coinData.logoURI,
          }
        }
      }
    } catch (error) {}

    return {}
  }

  private static async fetchFromTrustWallet(chainName: string, tokenAddress: string): Promise<string> {
    try {
      const chainMapping: Record<string, string> = {
        ethereum: 'ethereum',
        arbitrum: 'arbitrum',
        base: 'base',
      }

      const chain = chainMapping[chainName]
      if (!chain) return ''

      const logoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${tokenAddress}/logo.png`

      const response = await fetch(logoUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        return logoUrl
      }
    } catch (error) {}

    return ''
  }

  static clearCache(): void {
    logoCache.clear()
    tokenInfoCache.clear()
    tokenListCache.clear()
  }

  static getCacheSize(): number {
    return logoCache.size + tokenInfoCache.size + tokenListCache.size
  }
}
