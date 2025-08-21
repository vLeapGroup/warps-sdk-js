import { WarpChainEnv } from '@vleap/warps'

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
