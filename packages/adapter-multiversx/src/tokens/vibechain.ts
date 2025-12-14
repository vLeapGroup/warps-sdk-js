import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const VibechainChain: WarpChain = WarpChainName.Vibechain

export const VibechainTokens: WarpChainAsset[] = [
  {
    chain: VibechainChain,
    identifier: 'VIBE',
    name: 'VIBE',
    symbol: 'VIBE',
    decimals: 18,
    logoUrl: 'https://joai.ai/images/tokens/vibe.svg',
  },
  {
    chain: VibechainChain,
    identifier: 'VIBE-000000',
    name: 'VIBE',
    symbol: 'VIBE',
    decimals: 18,
    logoUrl: 'https://joai.ai/images/tokens/vibe.svg',
  },
]
