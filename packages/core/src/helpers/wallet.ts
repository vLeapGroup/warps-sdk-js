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

export const getWarpWalletExternalId = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.externalId || null
}

export const getWarpWalletPrivateKeyFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletPrivateKey(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletMnemonicFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletMnemonic(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletExternalIdFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletExternalId(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletExternalIdFromConfigOrFail = (config: WarpClientConfig, chain: WarpChain) => {
  const externalId = getWarpWalletExternalIdFromConfig(config, chain)
  if (!externalId) throw new Error(`No external ID configured for wallet onchain ${chain}`)
  return externalId
}

export const isWarpWalletReadOnly = (wallet: WarpWalletDetails | string | null | undefined): boolean => {
  return typeof wallet === 'string'
}
