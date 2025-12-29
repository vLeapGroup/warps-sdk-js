import { WarpChainAsset, WarpChainName } from '@vleap/warps'

const EthereumChain = WarpChainName.Ethereum

export const EthereumTokens: WarpChainAsset[] = [
  {
    chain: EthereumChain,
    identifier: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    chain: EthereumChain,
    identifier: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: EthereumChain,
    identifier: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: EthereumChain,
    identifier: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
  {
    chain: EthereumChain,
    identifier: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: EthereumChain,
    identifier: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
  },
]
