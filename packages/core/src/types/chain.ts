export type WarpChainAccount = {
  address: string
  balance: bigint
}

export type WarpChainAsset = {
  identifier: string
  name: string
  amount: bigint
  decimals?: number
  logoUrl?: string
}
