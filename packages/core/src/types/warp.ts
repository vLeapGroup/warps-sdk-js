import { WarpChainAsset, WarpChainAssetValue } from './chain'
import { WarpText } from './i18n'

export type WarpChain = string

export type WarpExplorerName = string

export type WarpChainInfo = {
  name: string
  displayName: string
  chainId: string
  blockTime: number
  addressHrp: string
  defaultApiUrl: string
  logoUrl: string
  nativeToken: WarpChainAsset
}

export type WarpIdType = 'hash' | 'alias'

export type WarpVarPlaceholder = string

export type WarpResultName = string

export type WarpResulutionPath = string

export type WarpMessageName = string

export type Warp = {
  protocol: string
  chain?: WarpChain
  name: string
  title: WarpText
  description: WarpText | null
  bot?: string
  preview?: string
  vars?: Record<WarpVarPlaceholder, string>
  actions: WarpAction[]
  next?: string
  results?: Record<WarpResultName, WarpResulutionPath>
  messages?: Record<WarpMessageName, string>
  meta?: WarpMeta
}

export type WarpMeta = {
  chain: WarpChain
  hash: string
  creator: string
  createdAt: string
}

export type WarpAction = WarpTransferAction | WarpContractAction | WarpQueryAction | WarpCollectAction | WarpLinkAction

export type WarpActionIndex = number

export type WarpActionType = 'transfer' | 'contract' | 'query' | 'collect' | 'link'

export type WarpTransferAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  data?: string
  value?: string
  transfers?: string[]
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
}

export type WarpContractAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  func?: string | null
  args?: string[]
  value?: string
  gasLimit: number
  transfers?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
}

export type WarpQueryAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  func?: string
  args?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
}

export type WarpCollectAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  destination: {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
  }
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
}

export type WarpLinkAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  url: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
}

export type WarpActionInputSource = 'field' | 'query' | 'user:wallet' | 'hidden'

export type BaseWarpActionInputType =
  | 'string'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'uint128'
  | 'uint256'
  | 'biguint'
  | 'bool'
  | 'address'
  | 'hex'
  | string

export type WarpActionInputType = string

export interface WarpStructValue {
  [key: string]: WarpNativeValue
}

export type WarpNativeValue = string | number | bigint | boolean | WarpChainAssetValue | null | WarpNativeValue[] | WarpStructValue

export type WarpActionInputPosition =
  | 'receiver'
  | 'value'
  | 'transfer'
  | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
  | 'data'
  | 'chain'
  | `payload:${string}`

export type WarpActionInputModifier = 'scale'

export type WarpActionInput = {
  name: string
  as?: string
  label?: WarpText
  description?: WarpText | null
  bot?: string
  type: WarpActionInputType
  position?: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number | WarpVarPlaceholder
  max?: number | WarpVarPlaceholder
  pattern?: string
  patternDescription?: WarpText
  options?: string[] | { [key: string]: string }
  modifier?: string
  default?: string | number | boolean
}

export type ResolvedInput = {
  input: WarpActionInput
  value: string | null
}

export type WarpContract = {
  address: string
  owner: string
  verified: boolean
}

export type WarpContractVerification = {
  codeHash: string
  abi: object
}

export type WarpExecutable = {
  chain: WarpChainInfo
  warp: Warp
  action: number
  destination: string
  args: string[]
  value: bigint
  transfers: WarpChainAssetValue[]
  data: string | null
  resolvedInputs: ResolvedInput[]
}
