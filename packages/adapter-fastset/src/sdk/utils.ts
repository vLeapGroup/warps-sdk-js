import { toB64, toHEX } from '@mysten/bcs'

export function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export function toBase64String(bytes: Uint8Array): string {
  return toB64(bytes)
}

export function toHexString(bytes: Uint8Array): string {
  return toHEX(bytes)
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
