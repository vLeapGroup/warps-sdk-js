import { WarpChain } from './warp'

export type WarpChainAccount = {
  chain: WarpChain
  address: string
  balance: bigint
}

export type WarpChainAssetValue = {
  identifier: string
  nonce: bigint
  amount: bigint
}

export type WarpChainAsset = {
  chain: WarpChain
  identifier: string
  name: string
  nonce?: bigint
  amount?: bigint
  decimals?: number
  logoUrl?: string
}

export type WarpChainAction = {
  chain: WarpChain
  id: string
  sender: string
  receiver: string
  value: bigint
  function: string
  status: WarpChainActionStatus
  createdAt: string
}

export type WarpChainActionStatus = 'pending' | 'success' | 'failed'
