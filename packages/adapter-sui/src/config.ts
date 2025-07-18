import { WarpChainEnv } from '@vleap/warps'

export const getSuiRegistryObjectId = (env: WarpChainEnv): string => {
  if (env === 'devnet') throw new Error('Sui registry package id is not available for devnet')
  if (env === 'testnet') '0x3ea0e74f722f7a96c20c0918aa77b457c8f850dc75446f3e86c6271196aeffa8'
  return 'TODO'
}

export const getSuiApiUrl = (env: WarpChainEnv): string => {
  if (env === 'devnet') return 'https://fullnode.devnet.sui.io'
  if (env === 'testnet') return 'https://fullnode.testnet.sui.io'
  return 'https://fullnode.mainnet.sui.io'
}
