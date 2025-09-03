import { WarpChain, WarpChainEnv } from '@vleap/warps'

export type KnownToken = {
  id: string
  name: string
  symbol: string
  decimals: number
  logoUrl: string
  chainId?: number // Optional for backward compatibility
}

export const KnownTokens: Record<WarpChain, Record<string, KnownToken[]>> = {
  ethereum: {
    mainnet: [
      {
        id: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      },
      {
        id: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        decimals: 8,
        logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
      },
      {
        id: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      },
      {
        id: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
      },
    ],
    testnet: [
      {
        id: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      },
      {
        id: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      },
    ],
  },
  arbitrum: {
    mainnet: [
      {
        id: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      },
      {
        id: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      },
    ],
  },
  base: {
    mainnet: [
      {
        id: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0x4200000000000000000000000000000000000006',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      },
      {
        id: '0x808456652fdb597867f38412077A9182bf77359F',
        name: 'Euro',
        symbol: 'EURC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/26045/standard/euro.png',
      },
      {
        id: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
        name: 'Coinbase Wrapped BTC',
        symbol: 'CBETH',
        decimals: 8,
        logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
      },
    ],
    testnet: [
      {
        id: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        name: 'USD',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0x808456652fdb597867f38412077A9182bf77359F',
        name: 'Euro',
        symbol: 'EURC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/26045/thumb/euro-coin.png?1655394420',
      },
      {
        id: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        decimals: 8,
        logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
      },
    ],
    devnet: [
      {
        id: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        name: 'USD',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      },
      {
        id: '0x808456652fdb597867f38412077A9182bf77359F',
        name: 'Euro',
        symbol: 'EURC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/26045/thumb/euro-coin.png?1655394420',
      },
      {
        id: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        decimals: 8,
        logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
      },
    ],
  },
}

export const findKnownTokenById = (chain: WarpChain, env: WarpChainEnv, id: string): KnownToken | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.id === id) || null
}

export const getKnownTokensForChain = (chainName: string, env: string = 'mainnet'): KnownToken[] => {
  return KnownTokens[chainName]?.[env] || []
}
