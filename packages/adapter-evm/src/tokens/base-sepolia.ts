import { WarpChainAsset, WarpChainName } from '@vleap/warps'

const BaseChain = WarpChainName.Base

export const BaseSepoliaTokens: WarpChainAsset[] = [
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
    identifier: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    name: 'USD',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: BaseChain,
    identifier: '0x808456652fdb597867f38412077A9182bf77359F',
    name: 'Euro',
    symbol: 'EURC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/26045/thumb/euro-coin.png?1655394420',
  },
  {
    chain: BaseChain,
    identifier: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
]
