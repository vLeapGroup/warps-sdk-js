import { WarpChainName, WarpChainAsset, WarpChainEnv } from '@joai/warps'

export const NearTokens: WarpChainAsset[] = []

export const KnownTokens: Partial<Record<WarpChainName, Record<string, WarpChainAsset[]>>> = {
  [WarpChainName.Near]: {
    mainnet: NearTokens,
    testnet: NearTokens,
    devnet: NearTokens,
  },
}

export const findKnownTokenById = (chain: WarpChainName, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: WarpChainName, env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
