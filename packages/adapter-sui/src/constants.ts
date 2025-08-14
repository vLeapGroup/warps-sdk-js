export const WarpSuiConstants = {
  Sui: {
    Identifier: 'SUI',
    DisplayName: 'Sui',
    Decimals: 9,
  },
}

export enum SuiExplorers {
  SuiVision = 'suivision',
  SuiVisionTestnet = 'suivision_testnet',
  SuiVisionDevnet = 'suivision_devnet',
  SuiScan = 'suiscan',
  SuiScanTestnet = 'suiscan_testnet',
  SuiScanDevnet = 'suiscan_devnet',
}

export type ExplorerName = SuiExplorers

export const SuiExplorersConfig = {
  sui: {
    mainnet: [SuiExplorers.SuiVision, SuiExplorers.SuiScan] as const,
    testnet: [SuiExplorers.SuiVisionTestnet, SuiExplorers.SuiScanTestnet] as const,
    devnet: [SuiExplorers.SuiVisionDevnet, SuiExplorers.SuiScanDevnet] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [SuiExplorers.SuiVision]: 'https://suivision.xyz',
  [SuiExplorers.SuiVisionTestnet]: 'https://testnet.suivision.xyz',
  [SuiExplorers.SuiVisionDevnet]: 'https://devnet.suivision.xyz',

  [SuiExplorers.SuiScan]: 'https://suiscan.xyz',
  [SuiExplorers.SuiScanTestnet]: 'https://testnet.suiscan.xyz',
  [SuiExplorers.SuiScanDevnet]: 'https://devnet.suiscan.xyz',
}
