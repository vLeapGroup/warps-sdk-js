import { WarpChainAsset, WarpChainName } from '@joai/warps'

const PolygonChain = WarpChainName.Polygon

export const PolygonMumbaiTokens: WarpChainAsset[] = [
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
    identifier: '0x0FA8781a83E46826621b3BC094Ea2Aea2Cdd993B',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
]
