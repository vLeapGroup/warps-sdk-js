import { WarpAdapterGenericRemoteTransaction } from './config'
import { WarpTheme } from './general'
import { WarpChain } from './warp'

export type WarpChainAccount = {
  chain: WarpChain
  address: string
  balance: bigint
}

export type WarpChainAssetValue = {
  identifier: string
  amount: bigint
}

export type WarpChainAssetLogoThemed = Record<WarpTheme, string>
export type WarpChainAssetLogo = string | WarpChainAssetLogoThemed | null

export type WarpChainAsset = {
  chain: WarpChain
  identifier: string
  name: string
  symbol: string
  amount?: bigint
  decimals?: number
  logoUrl?: WarpChainAssetLogo
  price?: number
  supply?: bigint
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
  error?: string | null
  tx?: WarpAdapterGenericRemoteTransaction | null
}

export type WarpChainActionStatus = 'pending' | 'success' | 'failed'
