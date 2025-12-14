export const WarpNearConstants = {
  NativeToken: {
    Identifier: 'NEAR',
    Decimals: 24,
  },
  Gas: {
    Default: '300000000000000',
    Transfer: '100000000000000',
    FunctionCall: '300000000000000',
  },
}

export enum NearExplorers {
  NearExplorer = 'near_explorer',
  NearBlocks = 'near_blocks',
  NearScan = 'nearscan',
}

export type ExplorerName = NearExplorers

export const NearExplorerMap = {
  near: {
    mainnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
    testnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
    devnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [NearExplorers.NearExplorer]: 'https://explorer.near.org',
  [NearExplorers.NearBlocks]: 'https://nearblocks.io',
  [NearExplorers.NearScan]: 'https://nearscan.io',
}

export const NearExplorerNames = {
  mainnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
  testnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
  devnet: [NearExplorers.NearExplorer, NearExplorers.NearBlocks, NearExplorers.NearScan] as const,
} as const

export const NearExplorerUrls: Record<ExplorerName, string> = ExplorerUrls
