export type ChainEnv = 'mainnet' | 'testnet' | 'devnet'

export type WarpConfig = {
  env: ChainEnv
  clientUrl?: string
  userAddress?: string
  chainApiUrl?: string
  schemaUrl?: string
}

export type TrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type WarpInfo = {
  hash: string
  alias: string | null
  trust: TrustStatus
  creator: string
  createdAt: number
}

export type WarpIdType = 'hash' | 'alias'

export type Warp = {
  protocol: string
  name: string
  title: string
  description: string | null
  preview: string
  actions: WarpAction[]
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
  inputs?: WarpActionInput[]
}

export type WarpLinkAction = {
  type: WarpActionType
  label: string
  description?: string | null
  url: string
  inputs?: WarpActionInput[]
}

export type WarpActionInputSource = 'field' | 'query'
export type WarpActionInputType = 'string' | 'uint8' | 'uint16' | 'uint32' | 'uint64' | 'biguint' | 'boolean' | 'address' | 'hex'
export type WarpActionInputPosition = 'value' | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

export type WarpActionInput = {
  name: string
  description?: string | null
  type: WarpActionInputType
  position: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number
  max?: number
}

export type WarpActionExecutionResult = {
  action: WarpAction
  user: {
    address: string
  }
  tx?: string
}
