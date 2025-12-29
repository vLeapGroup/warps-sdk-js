import { WarpChainName, WarpChainAsset, WarpChainEnv } from '@vleap/warps'
import { SolanaTokens } from './tokens/solana'

export const KnownTokens: Partial<Record<WarpChainName, Record<string, WarpChainAsset[]>>> = {
  [WarpChainName.Solana]: {
    mainnet: SolanaTokens,
    testnet: SolanaTokens,
    devnet: SolanaTokens,
  },
}

export const findKnownTokenById = (chain: WarpChainName, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: WarpChainName, env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
