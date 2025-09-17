import { WarpChainAsset, WarpChainEnv } from '@vleap/warps'
import { FastsetTokens } from './tokens/fastset'

export const KnownTokens: Record<string, WarpChainAsset[]> = {
  mainnet: FastsetTokens,
  testnet: FastsetTokens,
  devnet: FastsetTokens,
}

export const findKnownTokenBySymbol = (symbol: string, env: WarpChainEnv = 'mainnet'): WarpChainAsset | null => {
  const tokens = KnownTokens[env] || []
  return tokens.find((token) => token.symbol === symbol) || null
}

export const findKnownTokenById = (id: string, env: WarpChainEnv = 'mainnet'): WarpChainAsset | null => {
  const tokens = KnownTokens[env] || []
  return tokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[env] || []
}
