import { WarpChainName, WarpChainAsset, WarpChainEnv } from '@joai/warps'
import { SolanaMainnetTokens } from './tokens/solana-mainnet'
import { SolanaDevnetTokens } from './tokens/solana-devnet'
import { SolanaTestnetTokens } from './tokens/solana-testnet'

export const KnownTokens: Partial<Record<WarpChainName, Record<WarpChainEnv, WarpChainAsset[]>>> = {
  [WarpChainName.Solana]: {
    mainnet: SolanaMainnetTokens,
    testnet: SolanaTestnetTokens,
    devnet: SolanaDevnetTokens,
  },
}

export const findKnownTokenById = (chain: WarpChainName, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: WarpChainName, env: WarpChainEnv): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
