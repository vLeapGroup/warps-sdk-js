import { CacheType } from './WarpCache'

export type ChainEnv = 'mainnet' | 'testnet' | 'devnet'

export type ProtocolName = 'warp' | 'brand' | 'abi'

export type WarpChain = string

export type WarpConfig = {
  env: ChainEnv
  clientUrl?: string
  currentUrl?: string
  userAddress?: string
  chainApiUrl?: string
  warpSchemaUrl?: string
  brandSchemaUrl?: string
  cacheTtl?: number
  cacheType?: CacheType
  registryContract?: string
  indexUrl?: string
  indexApiKey?: string
  indexSearchParamName?: string
  vars?: Record<string, string | number>
}

export type WarpCacheConfig = {
  ttl?: number
}

export type TrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type RegistryInfo = {
  hash: string
  alias: string | null
  trust: TrustStatus
  creator: string
  createdAt: number
  brand: string | null
  upgrade: string | null
}

export type ChainInfo = {
  chainId: string
  apiUrl: string
}

export type WarpIdType = 'hash' | 'alias'

export type WarpVarPlaceholder = string

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
  meta?: WarpMeta
}

export type WarpMeta = {
  hash: string
  creator: string
  createdAt: string
}

export type WarpAction = WarpTransferAction | WarpContractAction | WarpQueryAction | WarpCollectAction | WarpLinkAction

export type WarpActionType = 'transfer' | 'contract' | 'query' | 'collect' | 'link'

export type WarpTransferAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address?: string
  data?: string
  value?: string
  transfers?: WarpContractActionTransfer[]
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpContractAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address: string
  func: string | null
  args: string[]
  value?: string
  gasLimit: number
  transfers?: WarpContractActionTransfer[]
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpContractActionTransfer = {
  token: string
  nonce?: number
  amount?: string
}

export type WarpLinkAction = {
  type: WarpActionType
  label: string
  description?: string | null
  url: string
  inputs?: WarpActionInput[]
}

export type WarpQueryAction = {
  type: WarpActionType
  chain?: WarpChain
  label: string
  description?: string | null
  address: string
  func: string
  args: string[]
  abi?: string
  inputs?: WarpActionInput[]
}

export type WarpCollectAction = {
  type: WarpActionType
  label: string
  description?: string | null
  destination: {
    url: string
    method: 'GET' | 'POST'
    headers: Record<string, string>
  }
  inputs?: WarpActionInput[]
  next?: string
}

export type WarpActionInputSource = 'field' | 'query'

export type BaseWarpActionInputType =
  | 'string'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'biguint'
  | 'bool'
  | 'address'
  | 'token'
  | 'codemeta'
  | 'hex'
  | 'esdt'
  | 'nft'

export type WarpActionInputType = string

export type WarpActionInputPosition = 'receiver' | 'value' | 'transfer' | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}` | 'data'

export type WarpActionInputModifier = 'scale'

export type WarpActionInput = {
  name: string
  as?: string
  description?: string | null
  bot?: string
  type: WarpActionInputType
  position: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number | WarpVarPlaceholder
  max?: number | WarpVarPlaceholder
  pattern?: string
  patternDescription?: string
  options?: string[]
  modifier?: string
}

export type WarpActionExecutionResult = {
  action: WarpAction
  user: {
    address: string
  }
  tx?: string
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

export type Brand = {
  protocol: string
  name: string
  description: string
  logo: string
  urls?: BrandUrls
  colors?: BrandColors
  cta?: BrandCta
  meta?: BrandMeta
}

export type BrandUrls = {
  web?: string
}

export type BrandColors = {
  primary?: string
  secondary?: string
}

export type BrandCta = {
  title: string
  description: string
  label: string
  url: string
}

export type BrandMeta = {
  hash: string
  creator: string
  createdAt: string
}

export type WarpSearchResult = {
  hits: WarpSearchHit[]
}

export type WarpSearchHit = {
  hash: string
  alias: string
  name: string
  title: string
  description: string
  preview: string
  status: string
  category: string
  featured: boolean
}

export type WarpAbi = {
  protocol: string
  content: AbiContents
  meta?: WarpMeta
}

export type AbiContents = {
  name?: string
  constructor?: any
  upgradeConstructor?: any
  endpoints?: any[]
  types?: Record<string, any>
  events?: any[]
}
