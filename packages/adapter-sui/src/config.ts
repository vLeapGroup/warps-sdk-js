import { WarpChainEnv } from '@vleap/warps'
import { ExplorerName, ExplorerUrls, SuiExplorersConfig } from './constants'

export const getSuiRegistryPackageId = (env: WarpChainEnv): string => {
  if (env === 'devnet') throw new Error('Sui registry package id is not available for devnet')
  if (env === 'testnet') return '0xc8824c98b09d36eec6c8b69ae7083e0b012b5e516e2f7a54c75bfa8a80105753'
  throw new Error('Sui registry package id is not available for mainnet')
}

export const getSuiRegistryObjectId = (env: WarpChainEnv): string => {
  if (env === 'devnet') throw new Error('Sui registry object id is not available for devnet')
  if (env === 'testnet') return ''
  throw new Error('Sui registry object id is not available for mainnet')
}

export const getSuiApiUrl = (env: WarpChainEnv): string => {
  if (env === 'devnet') return 'https://fullnode.devnet.sui.io'
  if (env === 'testnet') return 'https://fullnode.testnet.sui.io'
  return 'https://fullnode.mainnet.sui.io'
}

export const getSuiExplorers = (chain: string = 'sui', env: WarpChainEnv): readonly ExplorerName[] => {
  const chainExplorers = SuiExplorersConfig[chain as keyof typeof SuiExplorersConfig]
  if (!chainExplorers) {
    throw new Error(`Unsupported Sui chain: ${chain}`)
  }

  const explorers = chainExplorers[env as keyof typeof chainExplorers]
  if (!explorers) {
    throw new Error(`Unsupported environment ${env} for chain ${chain}`)
  }

  return explorers
}

export const getPrimarySuiExplorer = (chain: string = 'sui', env: WarpChainEnv): ExplorerName => {
  const explorers = getSuiExplorers(chain, env)
  return explorers[0]
}

export const getSuiExplorerUrl = (env: WarpChainEnv, chain: string = 'sui'): string => {
  const primaryExplorer = getPrimarySuiExplorer(chain, env)
  return ExplorerUrls[primaryExplorer]
}

export const getSuiExplorerByName = (chain: string = 'sui', env: WarpChainEnv, name: string): ExplorerName | undefined => {
  const explorers = getSuiExplorers(chain, env)
  return explorers.find((explorer) => explorer.toLowerCase() === name.toLowerCase())
}
