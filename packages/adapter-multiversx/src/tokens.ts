import { WarpChainName, WarpChainAsset, WarpChainEnv } from '@vleap/warps'
import { MultiversxDevnetTokens } from './tokens/multiversx-devnet'
import { MultiversxMainnetTokens } from './tokens/multiversx-mainnet'
import { MultiversxTestnetTokens } from './tokens/multiversx-testnet'
import { VibechainTokens } from './tokens/vibechain'

export const KnownTokens: Partial<Record<WarpChainName, Record<WarpChainEnv, WarpChainAsset[]>>> = {
  [WarpChainName.Multiversx]: {
    mainnet: MultiversxMainnetTokens,
    testnet: MultiversxTestnetTokens,
    devnet: MultiversxDevnetTokens,
  },
  [WarpChainName.Vibechain]: {
    mainnet: VibechainTokens,
    testnet: VibechainTokens,
    devnet: VibechainTokens,
  },
}

export const findKnownTokenById = (chain: WarpChainName, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chain: WarpChainName, env: WarpChainEnv): WarpChainAsset[] => {
  return KnownTokens[chain]?.[env] || []
}
