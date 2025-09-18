import { WarpChain, WarpChainAsset, WarpChainEnv } from '@vleap/warps'
import { MultiversxDevnetTokens } from './tokens/multiversx-devnet'
import { MultiversxMainnetTokens } from './tokens/multiversx-mainnet'
import { MultiversxTestnetTokens } from './tokens/multiversx-testnet'
import { VibechainTokens } from './tokens/vibechain'

export const KnownTokens: Record<WarpChain, Record<WarpChainEnv, WarpChainAsset[]>> = {
  multiversx: {
    mainnet: MultiversxMainnetTokens,
    testnet: MultiversxTestnetTokens,
    devnet: MultiversxDevnetTokens,
  },
  vibechain: {
    mainnet: VibechainTokens,
    testnet: VibechainTokens,
    devnet: VibechainTokens,
  },
}

export const findKnownTokenById = (chain: WarpChain, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chain: WarpChain, env: WarpChainEnv): WarpChainAsset[] => {
  return KnownTokens[chain]?.[env] || []
}
