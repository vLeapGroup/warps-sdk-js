import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const BaseChain: WarpChain = WarpChainName.Base

export const BaseTokens: WarpChainAsset[] = [
  {
    chain: BaseChain,
    identifier: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    chain: BaseChain,
    identifier: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: BaseChain,
    identifier: '0x4200000000000000000000000000000000000006',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: BaseChain,
    identifier: '0x808456652fdb597867f38412077A9182bf77359F',
    name: 'Euro',
    symbol: 'EURC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/26045/standard/euro.png',
  },
  {
    chain: BaseChain,
    identifier: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
    name: 'Coinbase Wrapped BTC',
    symbol: 'CBETH',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
]
