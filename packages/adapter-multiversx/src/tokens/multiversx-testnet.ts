import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const MultiversxChain: WarpChain = WarpChainName.Multiversx

export const MultiversxTestnetTokens: WarpChainAsset[] = [
  {
    chain: MultiversxChain,
    identifier: 'EGLD',
    name: 'eGold',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.png',
  },
  {
    chain: MultiversxChain,
    identifier: 'EGLD-000000',
    name: 'eGold',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.png',
  },
]
