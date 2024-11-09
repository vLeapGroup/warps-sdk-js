export type ChainEnv = 'mainnet' | 'testnet' | 'devnet'

export type WarpConfig = {
  env: ChainEnv
  clientUrl?: string
  userAddress?: string
  chainApiUrl?: string
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
  description: string | null
  address: string
  func: string | null
  args: any[]
  gasLimit: number
  value?: string
  inputs?: WarpActionInput[]
}

export type WarpLinkAction = {
  type: WarpActionType
  label: string
  description: string | null
  url: string
  inputs?: WarpActionInput[]
}

export type WarpActionInput = {
  type: 'query'
  name: string
  value: string
  position: string
}

export type RegistryInfo = {
  alias: string | null
  isPublic: boolean
}
