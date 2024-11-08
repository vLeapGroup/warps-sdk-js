export type ChainEnv = 'mainnet' | 'testnet' | 'devnet'

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
  endpoint: string | null
  args: any[]
}

export type WarpLinkAction = {
  type: WarpActionType
  label: string
  description: string | null
  url: string
}
