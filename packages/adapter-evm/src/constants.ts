export const WarpEvmConstants = {
  GasLimit: {
    Default: 21000,
    ContractCall: 100000,
    ContractDeploy: 500000,
    Transfer: 21000,
    TokenTransfer: 65000, // ERC-20 transfer gas limit
    Approve: 46000,
    Swap: 200000,
  },
  GasPrice: {
    Default: '20000000000',
  },
  Validation: {
    MinGasLimit: 21000,
    MaxGasLimit: 30000000,
  },
}

export enum EthereumExplorers {
  Etherscan = 'etherscan',
  EtherscanSepolia = 'etherscan_sepolia',
  Ethplorer = 'ethplorer',
  Blockscout = 'blockscout',
  BlockscoutSepolia = 'blockscout_sepolia',
}

export enum ArbitrumExplorers {
  Arbiscan = 'arbiscan',
  ArbiscanSepolia = 'arbiscan_sepolia',
  BlockscoutArbitrum = 'blockscout_arbitrum',
  BlockscoutArbitrumSepolia = 'blockscout_arbitrum_sepolia',
}

export enum BaseExplorers {
  Basescan = 'basescan',
  BasescanSepolia = 'basescan_sepolia',
  BlockscoutBase = 'blockscout_base',
  BlockscoutBaseSepolia = 'blockscout_base_sepolia',
}

export type ExplorerName = EthereumExplorers | ArbitrumExplorers | BaseExplorers

export const EvmExplorers = {
  ethereum: {
    mainnet: [EthereumExplorers.Etherscan, EthereumExplorers.Ethplorer, EthereumExplorers.Blockscout] as const,
    testnet: [EthereumExplorers.EtherscanSepolia, EthereumExplorers.BlockscoutSepolia] as const,
    devnet: [EthereumExplorers.EtherscanSepolia, EthereumExplorers.BlockscoutSepolia] as const,
  },
  arbitrum: {
    mainnet: [ArbitrumExplorers.Arbiscan, ArbitrumExplorers.BlockscoutArbitrum] as const,
    testnet: [ArbitrumExplorers.ArbiscanSepolia, ArbitrumExplorers.BlockscoutArbitrumSepolia] as const,
    devnet: [ArbitrumExplorers.ArbiscanSepolia, ArbitrumExplorers.BlockscoutArbitrumSepolia] as const,
  },
  base: {
    mainnet: [BaseExplorers.Basescan, BaseExplorers.BlockscoutBase] as const,
    testnet: [BaseExplorers.BasescanSepolia, BaseExplorers.BlockscoutBaseSepolia] as const,
    devnet: [BaseExplorers.BasescanSepolia, BaseExplorers.BlockscoutBaseSepolia] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [EthereumExplorers.Etherscan]: 'https://etherscan.io',
  [EthereumExplorers.EtherscanSepolia]: 'https://sepolia.etherscan.io',
  [EthereumExplorers.Ethplorer]: 'https://ethplorer.io',
  [EthereumExplorers.Blockscout]: 'https://eth.blockscout.com',
  [EthereumExplorers.BlockscoutSepolia]: 'https://sepolia.blockscout.com',

  [ArbitrumExplorers.Arbiscan]: 'https://arbiscan.io',
  [ArbitrumExplorers.ArbiscanSepolia]: 'https://sepolia.arbiscan.io',
  [ArbitrumExplorers.BlockscoutArbitrum]: 'https://arbitrum.blockscout.com',
  [ArbitrumExplorers.BlockscoutArbitrumSepolia]: 'https://sepolia.blockscout.com',

  [BaseExplorers.Basescan]: 'https://basescan.org',
  [BaseExplorers.BasescanSepolia]: 'https://sepolia.basescan.org',
  [BaseExplorers.BlockscoutBase]: 'https://base.blockscout.com',
  [BaseExplorers.BlockscoutBaseSepolia]: 'https://sepolia.blockscout.com',
}
