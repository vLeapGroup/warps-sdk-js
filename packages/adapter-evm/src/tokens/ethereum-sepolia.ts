import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const EthereumChain: WarpChain = WarpChainName.Ethereum

export const EthereumSepoliaTokens: WarpChainAsset[] = [
  {
    chain: EthereumChain,
    identifier: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: EthereumChain,
    identifier: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: EthereumChain,
    identifier: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
]
