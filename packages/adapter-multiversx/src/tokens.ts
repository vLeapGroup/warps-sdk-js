import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const MultiversxChain: WarpChain = WarpChainName.Multiversx

export const KnownTokens: WarpChainAsset[] = [
  {
    chain: MultiversxChain,
    identifier: 'EGLD',
    name: 'eGold',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.pngsvg',
  },
  {
    chain: MultiversxChain,
    identifier: 'EGLD-000000',
    name: 'eGold',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.png',
  },
  {
    chain: MultiversxChain,
    identifier: 'VIBE',
    name: 'VIBE',
    symbol: 'VIBE',
    decimals: 18,
    logoUrl: 'https://vleap.ai/images/tokens/vibe.svg',
  },
  {
    chain: MultiversxChain,
    identifier: 'VIBE-000000',
    name: 'VIBE',
    symbol: 'VIBE',
    decimals: 18,
    logoUrl: 'https://vleap.ai/images/tokens/vibe.svg',
  },
]

export const findKnownTokenById = (id: string): WarpChainAsset | null => KnownTokens.find((token) => token.identifier === id) || null
