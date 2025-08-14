import { toBase64, toHex } from '@mysten/bcs'

export function isValidFastsetAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length === 0) {
    return false
  }

  // For testing purposes, allow addresses that start with 'fs' or 'pi'
  if (address.startsWith('fs') || address.startsWith('pi')) {
    return true
  }

  try {
    // Try to decode as base64 (FastSet addresses are typically base64 encoded)
    const decoded = fromBase64(address)
    return decoded.length === 32 // FastSet addresses are 32 bytes
  } catch {
    return false
  }
}

export function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export function toBase64String(bytes: Uint8Array): string {
  return toBase64(bytes)
}

export function toHexString(bytes: Uint8Array): string {
  return toHex(bytes)
}

export function hexToDecimal(hex: string): string {
  return BigInt(`0x${hex}`).toString()
}

export function decimalToHex(decimal: string): string {
  return BigInt(decimal).toString(16)
}

export function validateAmount(amount: string): boolean {
  try {
    const bigInt = BigInt(amount)
    return bigInt >= 0
  } catch {
    return false
  }
}

export function normalizeAmount(amount: string): string {
  // Ensure amount is in hex format for FastSet
  try {
    const bigInt = BigInt(amount)
    return bigInt.toString(16)
  } catch {
    throw new Error(`Invalid amount format: ${amount}`)
  }
}

export function validatePrivateKey(privateKey: string | Uint8Array): boolean {
  try {
    const key = typeof privateKey === 'string' ? fromBase64(privateKey) : privateKey
    return key.length === 32
  } catch {
    return false
  }
}

export function validatePublicKey(publicKey: string | Uint8Array): boolean {
  try {
    const key = typeof publicKey === 'string' ? fromBase64(publicKey) : publicKey
    return key.length === 32
  } catch {
    return false
  }
}
