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
