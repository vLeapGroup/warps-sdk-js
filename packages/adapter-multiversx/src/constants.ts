export const WarpMultiversxConstants = {
  Egld: {
    Identifier: 'EGLD',
    EsdtIdentifier: 'EGLD-000000',
    DisplayName: 'eGold',
    Decimals: 18,
  },
}

export enum MultiversxExplorers {
  MultiversxExplorer = 'multiversx_explorer',
  MultiversxExplorerDevnet = 'multiversx_explorer_devnet',
  MultiversxExplorerTestnet = 'multiversx_explorer_testnet',
}

export enum VibechainExplorers {
  VibechainExplorer = 'vibechain_explorer',
  VibechainExplorerDevnet = 'vibechain_explorer_devnet',
  VibechainExplorerTestnet = 'vibechain_explorer_testnet',
}

export type ExplorerName = MultiversxExplorers | VibechainExplorers

export const MultiversxExplorersConfig = {
  multiversx: {
    mainnet: [MultiversxExplorers.MultiversxExplorer] as const,
    testnet: [MultiversxExplorers.MultiversxExplorerTestnet] as const,
    devnet: [MultiversxExplorers.MultiversxExplorerDevnet] as const,
  },
  vibechain: {
    mainnet: [VibechainExplorers.VibechainExplorer] as const,
    testnet: [VibechainExplorers.VibechainExplorerTestnet] as const,
    devnet: [VibechainExplorers.VibechainExplorerDevnet] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [MultiversxExplorers.MultiversxExplorer]: 'https://explorer.multiversx.com',
  [MultiversxExplorers.MultiversxExplorerDevnet]: 'https://devnet-explorer.multiversx.com',
  [MultiversxExplorers.MultiversxExplorerTestnet]: 'https://testnet-explorer.multiversx.com',

  [VibechainExplorers.VibechainExplorer]: 'https://vibeox-explorer.multiversx.com',
  [VibechainExplorers.VibechainExplorerDevnet]: 'https://vibeox-explorer.multiversx.com',
  [VibechainExplorers.VibechainExplorerTestnet]: 'https://vibeox-explorer.multiversx.com',
}
