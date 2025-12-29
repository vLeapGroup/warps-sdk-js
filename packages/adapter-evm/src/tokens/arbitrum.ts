import { WarpChainAsset, WarpChainName } from '@vleap/warps'

const ArbitrumChain = WarpChainName.Arbitrum

export const ArbitrumTokens: WarpChainAsset[] = [
  {
    chain: ArbitrumChain,
    identifier: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    chain: ArbitrumChain,
    identifier: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: ArbitrumChain,
    identifier: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: ArbitrumChain,
    identifier: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
]
