/**
 * Modern, dual-environment crypto utilities
 * Works in both Node.js and browser environments
 */

// Supported algorithms mapping
const ALGORITHM_MAP = {
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
} as const

type SupportedAlgorithm = keyof typeof ALGORITHM_MAP

/**
 * Environment detection
 */
const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined'
const isNode = typeof process !== 'undefined' && process.versions && typeof process.versions.node === 'string'

/**
 * Validate input parameters for random bytes generation
 */
function validateRandomBytesInput(size: number): void {
  if (size <= 0 || !Number.isInteger(size)) {
    throw new Error('Size must be a positive integer')
  }
}

/**
 * Validate input parameters for HMAC operations
 */
function validateHmacInputs(algorithm: string, key: string, data: string): void {
  if (!Object.keys(ALGORITHM_MAP).includes(algorithm.toLowerCase())) {
    throw new Error(`Unsupported algorithm: ${algorithm}. Supported: ${Object.keys(ALGORITHM_MAP).join(', ')}`)
  }

  if (typeof key !== 'string') {
    throw new Error('Key must be a string')
  }

  if (typeof data !== 'string') {
    throw new Error('Data must be a string')
  }
}

/**
 * Generate cryptographically secure random bytes
 */
export async function getRandomBytes(size: number): Promise<Uint8Array> {
  validateRandomBytesInput(size)

  try {
    if (isBrowser) {
      const array = new Uint8Array(size)
      window.crypto.getRandomValues(array)
      return array
    } else if (isNode) {
      // Use dynamic import to avoid bundler issues
      const { randomBytes } = await import('crypto')
      const buffer = randomBytes(size)
      return new Uint8Array(buffer)
    } else {
      throw new Error('Crypto not available in this environment')
    }
  } catch (error) {
    throw new Error(`Failed to generate random bytes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array')
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Convert Uint8Array to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array')
  }

  if (isBrowser && typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...bytes))
  } else if (isNode) {
    return Buffer.from(bytes).toString('base64')
  } else {
    throw new Error('Base64 encoding not available in this environment')
  }
}

/**
 * Generate a random hex string of specified length
 */
export async function getRandomHex(length: number): Promise<string> {
  if (length <= 0 || length % 2 !== 0) {
    throw new Error('Length must be a positive even number')
  }

  const bytes = await getRandomBytes(length / 2)
  return bytesToHex(bytes)
}

/**
 * Create HMAC signature
 */
export async function createHmacSignature(
  algorithm: string,
  key: string,
  data: string,
  encoding: 'base64' | 'hex' = 'base64'
): Promise<string> {
  validateHmacInputs(algorithm, key, data)

  const normalizedAlgorithm = algorithm.toLowerCase() as SupportedAlgorithm

  if (!ALGORITHM_MAP[normalizedAlgorithm]) {
    throw new Error(`Unsupported algorithm: ${algorithm}. Supported: ${Object.keys(ALGORITHM_MAP).join(', ')}`)
  }

  try {
    if (isBrowser) {
      const encoder = new TextEncoder()
      const keyData = encoder.encode(key)
      const messageData = encoder.encode(data)

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: ALGORITHM_MAP[normalizedAlgorithm] },
        false,
        ['sign']
      )

      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData)
      const signatureArray = new Uint8Array(signature)

      if (encoding === 'base64') {
        return bytesToBase64(signatureArray)
      } else {
        return bytesToHex(signatureArray)
      }
    } else if (isNode) {
      // Use dynamic import to avoid bundler issues
      const { createHmac } = await import('crypto')
      return createHmac(algorithm, key).update(data).digest(encoding)
    } else {
      throw new Error('Crypto not available in this environment')
    }
  } catch (error) {
    throw new Error(`Failed to create HMAC signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create SHA-256 hash (simplified interface for common use case)
 */
export async function createSha256Hash(data: string, encoding: 'base64' | 'hex' = 'hex'): Promise<string> {
  return createHmacSignature('sha256', '', data, encoding)
}

/**
 * Test if crypto functions are available in current environment
 */
export async function testCryptoAvailability(): Promise<{
  randomBytes: boolean
  hmac: boolean
  environment: 'browser' | 'nodejs' | 'unknown'
}> {
  const result: {
    randomBytes: boolean
    hmac: boolean
    environment: 'browser' | 'nodejs' | 'unknown'
  } = {
    randomBytes: false,
    hmac: false,
    environment: 'unknown',
  }

  try {
    if (isBrowser) {
      result.environment = 'browser'
    } else if (isNode) {
      result.environment = 'nodejs'
    }

    // Test random bytes
    await getRandomBytes(16)
    result.randomBytes = true

    // Test HMAC
    await createHmacSignature('sha256', 'test', 'test')
    result.hmac = true
  } catch (error) {
    // Functions failed, result remains false
  }

  return result
}
