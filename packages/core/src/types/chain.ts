export type WarpChainAccount = {
  address: string
  balance: bigint
}

export type WarpChainAssetValue = {
  identifier: string
  nonce: bigint
  amount: bigint
}

export type WarpChainAsset = {
  identifier: string
  name: string
  nonce?: bigint
  amount?: bigint
  decimals?: number
  logoUrl?: string
}
