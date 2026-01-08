import { WarpChainAsset, WarpChainName } from '@joai/warps'

const PolygonChain = WarpChainName.Polygon

export const PolygonTokens: WarpChainAsset[] = [
  {
    chain: PolygonChain,
    identifier: '0x0000000000000000000000000000000000000000',
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  },
  {
    chain: PolygonChain,
    identifier: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: PolygonChain,
    identifier: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: PolygonChain,
    identifier: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
  {
    chain: PolygonChain,
    identifier: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: PolygonChain,
    identifier: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
  },
]
