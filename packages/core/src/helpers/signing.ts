/**
 * Signing utilities for creating and validating signed messages
 * Works with any crypto provider or uses automatic detection
 */

import { CryptoProvider, getRandomHex } from './crypto'

export interface SignableMessage {
  wallet: string
  nonce: string
  expiresAt: string
  purpose: string
}

export type HttpAuthHeaders = Record<string, string> & {
  'X-Signer-Wallet': string
  'X-Signer-Signature': string
  'X-Signer-Nonce': string
  'X-Signer-ExpiresAt': string
}

/**
 * Creates a signable message with standard security fields
 * This can be used for any type of proof or authentication
 */
export async function createSignableMessage(
  walletAddress: string,
  purpose: string,
  cryptoProvider?: CryptoProvider,
  expiresInMinutes: number = 5
): Promise<{ message: string; nonce: string; expiresAt: string }> {
  const nonce = await getRandomHex(64, cryptoProvider)
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()

  const signableMessage: SignableMessage = {
    wallet: walletAddress,
    nonce,
    expiresAt,
    purpose,
  }

  const message = JSON.stringify(signableMessage)
  return { message, nonce, expiresAt }
}

/**
 * Creates a signable message for HTTP authentication
 * This is a convenience function that uses the standard format
 */
export async function createAuthMessage(
  walletAddress: string,
  appName: string,
  cryptoProvider?: CryptoProvider,
  purpose?: string
): Promise<{ message: string; nonce: string; expiresAt: string }> {
  const messagePurpose = purpose || `prove-wallet-ownership for app "${appName}"`
  return createSignableMessage(walletAddress, messagePurpose, cryptoProvider, 5)
}

/**
 * Creates HTTP authentication headers from a signature
 */
export function createAuthHeaders(walletAddress: string, signature: string, nonce: string, expiresAt: string): HttpAuthHeaders {
  return {
    'X-Signer-Wallet': walletAddress,
    'X-Signer-Signature': signature,
    'X-Signer-Nonce': nonce,
    'X-Signer-ExpiresAt': expiresAt,
  }
}

/**
 * Creates HTTP authentication headers for a wallet using the provided signing function
 */
export async function createHttpAuthHeaders(
  walletAddress: string,
  signMessage: (message: string) => Promise<string>,
  appName: string,
  cryptoProvider?: CryptoProvider
): Promise<HttpAuthHeaders> {
  const { message, nonce, expiresAt } = await createAuthMessage(walletAddress, appName, cryptoProvider)
  const signature = await signMessage(message)

  return createAuthHeaders(walletAddress, signature, nonce, expiresAt)
}

/**
 * Validates a signed message by checking expiration
 */
export function validateSignedMessage(expiresAt: string): boolean {
  const expirationTime = new Date(expiresAt).getTime()
  const currentTime = Date.now()
  return currentTime < expirationTime
}

/**
 * Parses a signed message to extract its components
 */
export function parseSignedMessage(message: string): SignableMessage {
  try {
    const parsed = JSON.parse(message)

    // Validate required fields
    if (!parsed.wallet || !parsed.nonce || !parsed.expiresAt || !parsed.purpose) {
      throw new Error('Invalid signed message: missing required fields')
    }

    return parsed as SignableMessage
  } catch (error) {
    throw new Error(`Failed to parse signed message: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
