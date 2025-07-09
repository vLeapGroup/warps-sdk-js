import { Adapter } from '../adapters'
import { WarpCacheType } from './cache'
import { WarpChainEnv } from './general'

export type WarpChain = string

export type WarpInitConfig = {
  env: WarpChainEnv
  repository: Adapter
  adapters: Adapter[]
  preferredChain?: WarpChain
  clientUrl?: string
  currentUrl?: string
  vars?: Record<string, string | number>
  user?: {
    wallet?: string
  }
  schema?: {
    warp?: string
    brand?: string
  }
  cache?: {
    ttl?: number
    type?: WarpCacheType
  }
  registry?: {
    contract?: string
  }
  index?: {
    url?: string
    apiKey?: string
    searchParamName?: string
  }
}

export type WarpCacheConfig = {
  ttl?: number
}

export type WarpChainInfo = {
  name: WarpChain
  displayName: string
  chainId: string
  blockTime: number
  addressHrp: string
  apiUrl: string
  explorerUrl: string
  nativeToken: string
}

export type WarpIdType = 'hash' | 'alias'

export type WarpVarPlaceholder = string

export type WarpResultName = string

export type WarpResulutionPath = string

export type WarpMessageName = string

export type Warp = {
  protocol: string
  name: string
  title: string
  description: string | null
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
  hash: string
  creator: string
  createdAt: string
}

export type WarpAction = WarpTransferAction | WarpContractAction | WarpQueryAction | WarpCollectAction | WarpLinkAction

export type WarpActionIndex = number

export type WarpActionType = 'transfer' | 'contract' | 'query' | 'collect' | 'link'

export type WarpTransferAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address?: string
  data?: string
  value?: string
  transfers?: string[]
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpContractAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address?: string
  func?: string | null
  args?: string[]
  value?: string
  gasLimit: number
  transfers?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpQueryAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address?: string
  func?: string
  args?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpCollectAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  destination: {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
  }
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpLinkAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  url: string
  inputs?: WarpActionInput[]
}

export type WarpActionInputSource = 'field' | 'query' | 'user:wallet'

export type BaseWarpActionInputType = 'string' | 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'biguint' | 'bool' | 'address' | 'hex' | string

export type WarpActionInputType = string

export type WarpNativeValue = string | number | bigint | boolean | null | WarpNativeValue[]

export type WarpActionInputPosition = 'receiver' | 'value' | 'transfer' | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}` | 'data' | 'chain'

export type WarpActionInputModifier = 'scale'

export type WarpActionInput = {
  name: string
  as?: string
  description?: string | null
  bot?: string
  type: WarpActionInputType
  position?: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number | WarpVarPlaceholder
  max?: number | WarpVarPlaceholder
  pattern?: string
  patternDescription?: string
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
  transfers: string[]
  data: string | null
  resolvedInputs: ResolvedInput[]
}
