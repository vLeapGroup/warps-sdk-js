import { WarpChainEnv } from '@vleap/warps'

// Fastset Chain configurations
export interface FastsetChainConfig {
  defaultApiUrl: string
  proxyUrl: string
  explorerUrl: string
  chainId: string
  registryAddress: string
  nativeToken: string
  blockTime?: number
}

// Predefined chain configurations
export const FASTSET_CHAIN_CONFIGS: Record<string, Record<WarpChainEnv, FastsetChainConfig>> = {
  fastset: {
    mainnet: {
      defaultApiUrl: 'http://157.90.201.117:8765',
      proxyUrl: 'http://136.243.61.168:44444',
      explorerUrl: 'https://explorer.fastset.com',
      chainId: '1',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'PI',
      blockTime: 12000,
    },
    testnet: {
      defaultApiUrl: 'http://157.90.201.117:8765',
      proxyUrl: 'http://136.243.61.168:44444',
      explorerUrl: 'https://testnet-explorer.fastset.com',
      chainId: '11155111',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'PI',
      blockTime: 12000,
    },
    devnet: {
      defaultApiUrl: 'http://157.90.201.117:8765',
      proxyUrl: 'http://136.243.61.168:44444',
      explorerUrl: 'http://localhost:4000',
      chainId: '1337',
      registryAddress: '0x0000000000000000000000000000000000000000',
      nativeToken: 'PI',
      blockTime: 12000,
    },
  },
}

// Default chain
const DEFAULT_CHAIN = 'fastset'

export const getFastsetChainConfig = (chain: string = DEFAULT_CHAIN, env: WarpChainEnv): FastsetChainConfig => {
  const chainConfigs = FASTSET_CHAIN_CONFIGS[chain]
  if (!chainConfigs) {
    throw new Error(`Unsupported Fastset chain: ${chain}`)
  }

  const config = chainConfigs[env]
  if (!config) {
    throw new Error(`Unsupported environment ${env} for chain ${chain}`)
  }

  return config
}

export const getFastsetApiUrl = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).apiUrl
}

export const getFastsetProxyUrl = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).proxyUrl
}

export const getFastsetExplorerUrl = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).explorerUrl
}

export const getFastsetChainId = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).chainId
}

export const getFastsetRegistryAddress = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).registryAddress
}

export const getFastsetNativeToken = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): string => {
  return getFastsetChainConfig(chain, env).nativeToken
}

export const getFastsetBlockTime = (env: WarpChainEnv, chain: string = DEFAULT_CHAIN): number => {
  return getFastsetChainConfig(chain, env).blockTime || 12000
}

// Helper function to get all supported chains
export const getSupportedFastsetChains = (): string[] => {
  return Object.keys(FASTSET_CHAIN_CONFIGS)
}

// Helper function to get all supported environments for a chain
export const getSupportedEnvironments = (chain: string): WarpChainEnv[] => {
  const chainConfigs = FASTSET_CHAIN_CONFIGS[chain]
  if (!chainConfigs) {
    return []
  }
  return Object.keys(chainConfigs) as WarpChainEnv[]
}
