import { WarpChainEnv } from '@vleap/warps'

// EVM Chain configurations
export interface EvmChainConfig {
  apiUrl: string
  explorerUrl: string
  chainId: string
  registryAddress: string
  nativeToken: string
  blockTime?: number
}

// Predefined chain configurations
export const EVM_CHAIN_CONFIGS: Record<string, Record<WarpChainEnv, EvmChainConfig>> = {
  ethereum: {
    mainnet: {
      apiUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      explorerUrl: 'https://etherscan.io',
      chainId: '1',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 12,
    },
    testnet: {
      apiUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
      explorerUrl: 'https://sepolia.etherscan.io',
      chainId: '11155111',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 12,
    },
    devnet: {
      apiUrl: 'http://localhost:8545',
      explorerUrl: 'http://localhost:4000',
      chainId: '1337',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 12,
    },
  },
  arbitrum: {
    mainnet: {
      apiUrl: 'https://arb-mainnet.g.alchemy.com/v2/demo',
      explorerUrl: 'https://arbiscan.io',
      chainId: '42161',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 1,
    },
    testnet: {
      apiUrl: 'https://arb-sepolia.g.alchemy.com/v2/demo',
      explorerUrl: 'https://sepolia.arbiscan.io',
      chainId: '421614',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 1,
    },
    devnet: {
      apiUrl: 'http://localhost:8545',
      explorerUrl: 'http://localhost:4000',
      chainId: '1337',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 1,
    },
  },
  base: {
    mainnet: {
      apiUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      chainId: '8453',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 2,
    },
    testnet: {
      apiUrl: 'https://sepolia.base.org',
      explorerUrl: 'https://sepolia.basescan.org',
      chainId: '84532',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 2,
    },
    devnet: {
      apiUrl: 'http://localhost:8545',
      explorerUrl: 'http://localhost:4000',
      chainId: '1337',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'ETH',
      blockTime: 2,
    },
  },
}

// Default chain (Ethereum)
const DEFAULT_CHAIN = 'ethereum'

export const getEvmChainConfig = (chain: string = DEFAULT_CHAIN, env: WarpChainEnv): EvmChainConfig => {
  const chainConfigs = EVM_CHAIN_CONFIGS[chain]
  if (!chainConfigs) {
    throw new Error(`Unsupported EVM chain: ${chain}`)
  }

  const config = chainConfigs[env]
  if (!config) {
    throw new Error(`Unsupported environment ${env} for chain ${chain}`)
  }

  return config
}

export const getEvmApiUrl = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getEvmChainConfig(chain, env).apiUrl
}

export const getEvmExplorerUrl = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getEvmChainConfig(chain, env).explorerUrl
}

export const getEvmChainId = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getEvmChainConfig(chain, env).chainId
}

export const getEvmRegistryAddress = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getEvmChainConfig(chain, env).registryAddress
}

export const getEvmNativeToken = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getEvmChainConfig(chain, env).nativeToken
}

export const getEvmBlockTime = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): number => {
  return getEvmChainConfig(chain, env).blockTime || 12
}

// Helper function to get all supported chains
export const getSupportedEvmChains = (): string[] => {
  return Object.keys(EVM_CHAIN_CONFIGS)
}

// Helper function to get all supported environments for a chain
export const getSupportedEnvironments = (chain: string): WarpChainEnv[] => {
  const chainConfigs = EVM_CHAIN_CONFIGS[chain]
  if (!chainConfigs) {
    return []
  }
  return Object.keys(chainConfigs) as WarpChainEnv[]
}
