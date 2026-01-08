import { WarpChainAsset, WarpChainName } from '@joai/warps'

const SolanaChain = WarpChainName.Solana

export const SolanaDevnetTokens: WarpChainAsset[] = [
  {
    chain: SolanaChain,
    identifier: 'SOL',
    name: 'SOL',
    symbol: 'SOL',
    decimals: 9,
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  },
  {
    chain: SolanaChain,
    identifier: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: SolanaChain,
    identifier: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: SolanaChain,
    identifier: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    symbol: 'WSOL',
    decimals: 9,
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  },
]
