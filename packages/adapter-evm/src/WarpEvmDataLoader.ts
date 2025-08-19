import { AdapterWarpDataLoader, WarpChainAccount, WarpChainAsset, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl, getEvmChainConfig } from './config'

// ERC20 ABI for token interactions
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
]

// ERC20 Transfer event for token detection
const ERC20_TRANSFER_EVENT = 'event Transfer(address indexed from, address indexed to, uint256 value)'

// Known token lists for popular chains
const KNOWN_TOKENS: Record<string, Record<string, { name: string; symbol: string; decimals: number; logoUrl?: string }>> = {
  ethereum: {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    },
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      decimals: 8,
      logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    },
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
    },
  },
  arbitrum: {
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    },
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': {
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
  },
  base: {
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    },
    '0x4200000000000000000000000000000000000006': {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
  },
}

interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

interface TokenBalance {
  tokenAddress: string
  balance: bigint
  metadata: TokenMetadata
}

export class WarpEvmDataLoader implements AdapterWarpDataLoader {
  private provider: ethers.JsonRpcProvider
  private chainConfig: any

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.provider = new ethers.JsonRpcProvider(getEvmApiUrl(this.config.env, this.chain.name))
    this.chainConfig = getEvmChainConfig(this.chain.name, this.config.env)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
      const balance = await this.provider.getBalance(address)

      return {
        address,
        balance,
      }
    } catch (error) {
      throw new Error(`Failed to get account balance for ${address}: ${error}`)
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      const assets: WarpChainAsset[] = []

      // Get ERC20 token balances
      const tokenBalances = await this.getERC20TokenBalances(address)

      for (const tokenBalance of tokenBalances) {
        if (tokenBalance.balance > 0n) {
          assets.push({
            identifier: tokenBalance.tokenAddress,
            name: tokenBalance.metadata.name,
            amount: tokenBalance.balance,
            decimals: tokenBalance.metadata.decimals,
            logoUrl: tokenBalance.metadata.logoUrl || '',
          })
        }
      }

      return assets
    } catch (error) {
      throw new Error(`Failed to get account assets for ${address}: ${error}`)
    }
  }

  private async getERC20TokenBalances(address: string): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = []

    // Get known tokens for this chain
    const knownTokens = KNOWN_TOKENS[this.chain.name] || {}

    // Process known tokens first
    for (const [tokenAddress, metadata] of Object.entries(knownTokens)) {
      try {
        const balance = await this.getTokenBalance(address, tokenAddress)
        if (balance > 0n) {
          tokenBalances.push({
            tokenAddress,
            balance,
            metadata,
          })
        }
      } catch (error) {
        // Skip tokens that fail to load
        console.warn(`Failed to get balance for token ${tokenAddress}: ${error}`)
      }
    }

    // Try to detect additional tokens from transfer events
    const additionalTokens = await this.detectTokensFromEvents(address)
    for (const tokenAddress of additionalTokens) {
      if (!knownTokens[tokenAddress]) {
        try {
          const metadata = await this.getTokenMetadata(tokenAddress)
          const balance = await this.getTokenBalance(address, tokenAddress)
          if (balance > 0n) {
            tokenBalances.push({
              tokenAddress,
              balance,
              metadata,
            })
          }
        } catch (error) {
          // Skip tokens that fail to load
          console.warn(`Failed to get metadata/balance for detected token ${tokenAddress}: ${error}`)
        }
      }
    }

    return tokenBalances
  }

  private async getTokenBalance(address: string, tokenAddress: string): Promise<bigint> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
      const balance = await contract.balanceOf(address)
      return balance
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error}`)
    }
  }

  private async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)

      const [name, symbol, decimals] = await Promise.all([contract.name(), contract.symbol(), contract.decimals()])

      return {
        name: name || 'Unknown Token',
        symbol: symbol || 'UNKNOWN',
        decimals: decimals || 18,
      }
    } catch (error) {
      throw new Error(`Failed to get token metadata: ${error}`)
    }
  }

  private async detectTokensFromEvents(address: string): Promise<string[]> {
    try {
      // Get recent blocks to scan for transfer events
      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000) // Scan last 10k blocks

      // Create filter for Transfer events where the address is the recipient
      const filter = {
        fromBlock,
        toBlock: currentBlock,
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null, // from address (any)
          ethers.zeroPadValue(address, 32), // to address (our target)
        ],
      }

      const logs = await this.provider.getLogs(filter)

      // Extract unique token addresses from transfer events
      const tokenAddresses = new Set<string>()
      for (const log of logs) {
        tokenAddresses.add(log.address)
      }

      return Array.from(tokenAddresses)
    } catch (error) {
      console.warn(`Failed to detect tokens from events: ${error}`)
      return []
    }
  }

  // Additional utility methods for enhanced token support
  async getTokenInfo(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      return await this.getTokenMetadata(tokenAddress)
    } catch (error) {
      console.warn(`Failed to get token info for ${tokenAddress}: ${error}`)
      return null
    }
  }

  async getTokenBalanceForAddress(address: string, tokenAddress: string): Promise<bigint> {
    try {
      return await this.getTokenBalance(address, tokenAddress)
    } catch (error) {
      throw new Error(`Failed to get token balance for ${tokenAddress}: ${error}`)
    }
  }

  async getMultipleTokenBalances(address: string, tokenAddresses: string[]): Promise<Map<string, bigint>> {
    const balances = new Map<string, bigint>()

    await Promise.all(
      tokenAddresses.map(async (tokenAddress) => {
        try {
          const balance = await this.getTokenBalance(address, tokenAddress)
          balances.set(tokenAddress, balance)
        } catch (error) {
          console.warn(`Failed to get balance for token ${tokenAddress}: ${error}`)
          balances.set(tokenAddress, 0n)
        }
      })
    )

    return balances
  }
}
