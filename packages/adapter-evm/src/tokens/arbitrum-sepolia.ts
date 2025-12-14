import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const ArbitrumChain: WarpChain = WarpChainName.Arbitrum

export const ArbitrumSepoliaTokens: WarpChainAsset[] = [
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
    identifier: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: ArbitrumChain,
    identifier: '0xC6d2Bd6437655FBc6689Bfc987E09846aC4367Ed',
    name: 'Wrapped SET',
    symbol: 'WSET',
    decimals: 18,
    logoUrl: 'https://joai.ai/images/tokens/set-black.svg',
  },
]
