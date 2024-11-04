export type Warp = {
    name: string
    description: string
    actions: WarpAction[]
}

export type WarpAction = WarpContractAction | WarpLinkAction

export type WarpContractAction = {
    type: WarpActionType
    name: string
    description: string
    address: string
    endpoint: string | null
    args: any[]
}

export type WarpLinkAction = {
    type: WarpActionType
    name: string
    description: string
    url: string
}

export type WarpActionType = 'contract' | 'link'
