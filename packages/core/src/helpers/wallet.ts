import { WarpChain, WarpClientConfig, WarpWalletDetails } from '../types'

export const getWarpWalletAddress = (wallet: WarpWalletDetails | string | null | undefined) => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.address
}

export const getWarpWalletAddressFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletAddress(config.user?.wallets?.[chain] || null)

export const getWarpWalletPrivateKey = (wallet: WarpWalletDetails | string | null | undefined) => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.privateKey
}

export const getWarpWalletMnemonic = (wallet: WarpWalletDetails | string | null | undefined) => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.mnemonic
}

export const getWarpWalletPrivateKeyFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletPrivateKey(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletMnemonicFromConfig = (config: WarpClientConfig, chain: WarpChain) =>
  getWarpWalletMnemonic(config.user?.wallets?.[chain] || null)?.trim() || null
