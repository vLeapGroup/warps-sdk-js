export interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

export interface TokenBalance {
  tokenAddress: string
  balance: bigint
  metadata: TokenMetadata
}

export interface TokenInfo {
  name?: string
  symbol?: string
  logoURI?: string
  decimals?: number
}

export interface UniswapToken {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
  extensions?: {
    bridgeInfo?: Record<string, { tokenAddress: string }>
  }
}

export interface UniswapTokenList {
  name: string
  timestamp: string
  version: {
    major: number
    minor: number
    patch: number
  }
  tokens: UniswapToken[]
}

export interface TokenListResponse {
  tokens: Array<{
    chainId: number
    address: string
    name: string
    symbol: string
    decimals: number
    logoURI?: string
  }>
}
