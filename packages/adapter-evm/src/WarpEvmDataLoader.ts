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
import { ethers } from 'ethers'
import { EvmLogoService } from './LogoService'

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
    // Sepolia testnet tokens
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    },
    '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06': {
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9': {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
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
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    },
    '0x808456652fdb597867f38412077A9182bf77359F': {
      name: 'Euro Coin',
      symbol: 'EURC',
      decimals: 6,
      logoUrl: 'https://assets.coingecko.com/coins/images/26045/standard/euro.png',
    },
    '0xcbB7C0006F23900c38EB856149F799620fcb8A4a': {
      name: 'Coinbase Wrapped BTC',
      symbol: 'CBETH',
      decimals: 8,
      logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
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

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    // Create provider with explicit network configuration using ethers.Network
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(apiUrl, network)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
      const balance = await this.provider.getBalance(address)

      return {
        chain: this.chain.name,
        address,
        balance,
      }
    } catch (error) {
      throw new Error(`Failed to get account balance for ${address}: ${error}`)
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      // Get native token balance and ERC20 token balances in parallel
      const accountReq = this.getAccount(address)
      const tokenBalancesReq = this.getERC20TokenBalances(address)
      const [account, tokenBalances] = await Promise.all([accountReq, tokenBalancesReq])

      const assets: WarpChainAsset[] = []

      // Add native token balance
      if (account.balance > 0n) {
        assets.push({ ...this.chain.nativeToken, amount: account.balance })
      }

      // Add ERC20 token balances
      for (const tokenBalance of tokenBalances) {
        if (tokenBalance.balance > 0n) {
          const logoUrl =
            tokenBalance.metadata.logoUrl ||
            (await EvmLogoService.getLogoUrl(
              this.chain.name,
              tokenBalance.tokenAddress,
              tokenBalance.metadata.name,
              tokenBalance.metadata.symbol
            ))

          assets.push({
            chain: this.chain.name,
            identifier: tokenBalance.tokenAddress,
            name: tokenBalance.metadata.name,
            amount: tokenBalance.balance,
            decimals: tokenBalance.metadata.decimals,
            logoUrl: logoUrl || '',
          })
        }
      }

      return assets
    } catch (error) {
      throw new Error(`Failed to get account assets for ${address}: ${error}`)
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
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
      const tokenInfo = await EvmLogoService.getTokenInfo(this.chain.name, tokenAddress)

      if (tokenInfo.name && tokenInfo.symbol && tokenInfo.decimals !== undefined) {
        return {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          logoUrl: tokenInfo.logoURI,
        }
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
      const [name, symbol, decimals] = await Promise.all([
        contract.name().catch(() => tokenInfo.name || 'Unknown Token'),
        contract.symbol().catch(() => tokenInfo.symbol || 'UNKNOWN'),
        contract.decimals().catch(() => tokenInfo.decimals || 18),
      ])

      return {
        name: name || tokenInfo.name || 'Unknown Token',
        symbol: symbol || tokenInfo.symbol || 'UNKNOWN',
        decimals: decimals || tokenInfo.decimals || 18,
        logoUrl: tokenInfo.logoURI,
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
      return []
    }
  }

  // Additional utility methods for enhanced token support
  async getTokenInfo(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      return await this.getTokenMetadata(tokenAddress)
    } catch (error) {
      // Silently fail for invalid addresses or network issues
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
          // Silently fail for invalid addresses or network issues
          balances.set(tokenAddress, 0n)
        }
      })
    )

    return balances
  }

  async getAccountTokens(address: string): Promise<WarpChainAsset[]> {
    return this.getAccountAssets(address)
  }

  async getTokenMetadataPublic(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      return await this.getTokenMetadata(tokenAddress)
    } catch (error) {
      return null
    }
  }

  async getChainInfo(): Promise<{ chainId: string; blockTime: number }> {
    try {
      const network = await this.provider.getNetwork()
      const latestBlock = await this.provider.getBlock('latest')

      return {
        chainId: network.chainId.toString(),
        blockTime: latestBlock?.timestamp ? Date.now() / 1000 - latestBlock.timestamp : 12,
      }
    } catch (error) {
      throw new Error(`Failed to get chain info: ${error}`)
    }
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    return null
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }
}
