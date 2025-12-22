import { WarpChain, WarpClientConfig, WarpWalletDetails } from '../types'

export const getWalletFromConfigOrFail = (config: WarpClientConfig, chain: WarpChain): string | WarpWalletDetails => {
  const wallet = config.user?.wallets?.[chain] || null
  if (!wallet) throw new Error(`No wallet configured for chain ${chain}`)
  return wallet
}

export const getWarpWalletAddress = (wallet: WarpWalletDetails | string | null | undefined) => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.address
}

export const getWarpWalletAddressFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletAddress(config.user?.wallets?.[chain] || null)

export const getWarpWalletPrivateKey = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.privateKey || null
}

export const getWarpWalletMnemonic = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.mnemonic || null
}

export const getWarpWalletProviderId = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.providerId || null
}

export const getWarpWalletPrivateKeyFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletPrivateKey(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletMnemonicFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletMnemonic(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletProviderIdFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletProviderId(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletProviderIdFromConfigOrFail = (config: WarpClientConfig, chain: WarpChain) => {
  const providerId = getWarpWalletProviderIdFromConfig(config, chain)
  if (!providerId) throw new Error(`No provider ID configured for wallet onchain ${chain}`)
  return providerId
}
