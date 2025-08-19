export interface CryptoProvider {
  getRandomBytes(size: number): Promise<Uint8Array>
}

export class BrowserCryptoProvider implements CryptoProvider {
  async getRandomBytes(size: number): Promise<Uint8Array> {
    if (typeof window === 'undefined' || !window.crypto) {
      throw new Error('Web Crypto API not available')
    }
    const array = new Uint8Array(size)
    window.crypto.getRandomValues(array)
    return array
  }
}

export class NodeCryptoProvider implements CryptoProvider {
  async getRandomBytes(size: number): Promise<Uint8Array> {
    if (typeof process === 'undefined' || !process.versions?.node) {
      throw new Error('Node.js environment not detected')
    }

    try {
      const crypto = await import('crypto')
      return new Uint8Array(crypto.randomBytes(size))
    } catch (error) {
      throw new Error(`Node.js crypto not available: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

let globalCryptoProvider: CryptoProvider | null = null

export function getCryptoProvider(): CryptoProvider {
  if (globalCryptoProvider) return globalCryptoProvider

  if (typeof window !== 'undefined' && window.crypto) {
    globalCryptoProvider = new BrowserCryptoProvider()
    return globalCryptoProvider
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    globalCryptoProvider = new NodeCryptoProvider()
    return globalCryptoProvider
  }

  throw new Error(
    'No compatible crypto provider found. Please provide a crypto provider using setCryptoProvider() or ensure Web Crypto API is available.'
  )
}

export function setCryptoProvider(provider: CryptoProvider): void {
  globalCryptoProvider = provider
}

export async function getRandomBytes(size: number, cryptoProvider?: CryptoProvider): Promise<Uint8Array> {
  if (size <= 0 || !Number.isInteger(size)) {
    throw new Error('Size must be a positive integer')
  }

  const provider = cryptoProvider || getCryptoProvider()
  return provider.getRandomBytes(size)
}

export function bytesToHex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array')
  }

  const hex = new Array(bytes.length * 2)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    hex[i * 2] = (byte >>> 4).toString(16)
    hex[i * 2 + 1] = (byte & 0xf).toString(16)
  }
  return hex.join('')
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array')
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  } else if (typeof btoa !== 'undefined') {
    const binary = String.fromCharCode.apply(null, Array.from(bytes))
    return btoa(binary)
  } else {
    throw new Error('Base64 encoding not available in this environment')
  }
}

export async function getRandomHex(length: number, cryptoProvider?: CryptoProvider): Promise<string> {
  if (length <= 0 || length % 2 !== 0) {
    throw new Error('Length must be a positive even number')
  }

  const bytes = await getRandomBytes(length / 2, cryptoProvider)
  return bytesToHex(bytes)
}

export async function testCryptoAvailability(): Promise<{
  randomBytes: boolean
  environment: 'browser' | 'nodejs' | 'unknown'
}> {
  const result: {
    randomBytes: boolean
    environment: 'browser' | 'nodejs' | 'unknown'
  } = {
    randomBytes: false,
    environment: 'unknown',
  }

  try {
    if (typeof window !== 'undefined' && window.crypto) {
      result.environment = 'browser'
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      result.environment = 'nodejs'
    }

    await getRandomBytes(16)
    result.randomBytes = true
  } catch (error) {
    // Functions failed, result remains false
  }

  return result
}

export function createCryptoProvider(): CryptoProvider {
  return getCryptoProvider()
}
