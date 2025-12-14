import { WarpChain, WarpChainAsset, WarpChainEnv } from '@vleap/warps'

export const NearTokens: WarpChainAsset[] = []

export const KnownTokens: Record<WarpChain, Record<string, WarpChainAsset[]>> = {
  near: {
    mainnet: NearTokens,
    testnet: NearTokens,
    devnet: NearTokens,
  },
}

export const findKnownTokenById = (chain: WarpChain, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: string, env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
