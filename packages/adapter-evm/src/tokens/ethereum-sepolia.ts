import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const EthereumChain: WarpChain = WarpChainName.Ethereum

export const EthereumSepoliaTokens: WarpChainAsset[] = [
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
    identifier: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: EthereumChain,
    identifier: '0xC6d2Bd6437655FBc6689Bfc987E09846aC4367Ed',
    name: 'Wrapped SET',
    symbol: 'WSET',
    decimals: 18,
    logoUrl: 'https://joai.ai/images/tokens/set-black.svg',
  },
]
