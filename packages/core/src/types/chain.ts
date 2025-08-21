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
  nonce?: bigint
  name: string
  amount: bigint
  decimals?: number
  logoUrl?: string
}
