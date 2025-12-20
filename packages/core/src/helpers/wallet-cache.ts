import { WalletProvider } from '../types'

export interface WalletCache {
  address: string | null
  publicKey: string | null
}

export async function initializeWalletCache(provider: WalletProvider | null): Promise<WalletCache> {
  const cache: WalletCache = {
    address: null,
    publicKey: null,
  }

  if (!provider) {
    return cache
  }

  try {
    cache.address = await provider.getAddress()
  } catch {
    // Address fetch failed, leave as null
  }

  try {
    cache.publicKey = await provider.getPublicKey()
  } catch {
    // Public key fetch failed, leave as null
  }

  return cache
}
