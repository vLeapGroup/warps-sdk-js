export type ChainEnv = 'mainnet' | 'testnet' | 'devnet'

export type WarpConfig = {
  env: ChainEnv
  clientUrl?: string
  userAddress?: string
  chainApiUrl?: string
  warpSchemaUrl?: string
  brandSchemaUrl?: string
  cacheTtl?: number
}

export type WarpCacheConfig = {
  ttl?: number
}

export type TrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type WarpInfo = {
  hash: string
  alias: string | null
  trust: TrustStatus
  creator: string
  createdAt: number
  brand: string | null
  prev: string | null
}

export type WarpIdType = 'hash' | 'alias'

export type Warp = {
  protocol: string
  name: string
  title: string
  description: string | null
  preview: string
  actions: WarpAction[]
  next?: string
  meta?: WarpMeta
}

export type WarpMeta = {
  hash: string
  creator: string
  createdAt: string
}

export type WarpAction = WarpContractAction | WarpLinkAction

export type WarpActionType = 'contract' | 'link'

export type WarpContractAction = {
  type: WarpActionType
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

export type WarpActionInputSource = 'field' | 'query'

export type WarpActionInputType =
  | 'string'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'biguint'
  | 'boolean'
  | 'address'
  | 'hex'
  | 'esdt'
  | 'nft'

export type WarpActionInputPosition = 'value' | 'transfer' | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

export type WarpActionInput = {
  name: string
  description?: string | null
  type: WarpActionInputType
  position: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  patternDescription?: string
  options?: string[]
}

export type WarpActionExecutionResult = {
  action: WarpAction
  user: {
    address: string
  }
  tx?: string
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
