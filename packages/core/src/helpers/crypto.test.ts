import {
  bytesToBase64,
  bytesToHex,
  createHmacSignature,
  createSha256Hash,
  getRandomBytes,
  getRandomHex,
  testCryptoAvailability,
} from './crypto'

describe('Crypto Utilities', () => {
  describe('getRandomBytes', () => {
    it('should generate random bytes of specified size', async () => {
      const size = 32
      const bytes = await getRandomBytes(size)

      expect(bytes).toBeInstanceOf(Uint8Array)
      expect(bytes.length).toBe(size)
    })

    it('should generate different random bytes on each call', async () => {
      const size = 16
      const bytes1 = await getRandomBytes(size)
      const bytes2 = await getRandomBytes(size)

      expect(bytes1).not.toEqual(bytes2)
    })

    it('should throw error for invalid size', async () => {
      await expect(getRandomBytes(0)).rejects.toThrow('Size must be a positive integer')
      await expect(getRandomBytes(-1)).rejects.toThrow('Size must be a positive integer')
      await expect(getRandomBytes(1.5)).rejects.toThrow('Size must be a positive integer')
    })
  })

  describe('bytesToHex', () => {
    it('should convert Uint8Array to hex string', () => {
      const bytes = new Uint8Array([0, 255, 16, 32])
      const hex = bytesToHex(bytes)

      expect(hex).toBe('00ff1020')
    })

    it('should handle empty array', () => {
      const bytes = new Uint8Array([])
      const hex = bytesToHex(bytes)

      expect(hex).toBe('')
    })

    it('should throw error for invalid input', () => {
      expect(() => bytesToHex(null as any)).toThrow('Input must be a Uint8Array')
      expect(() => bytesToHex(undefined as any)).toThrow('Input must be a Uint8Array')
      expect(() => bytesToHex('invalid' as any)).toThrow('Input must be a Uint8Array')
    })
  })

  describe('bytesToBase64', () => {
    it('should convert Uint8Array to base64 string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const base64 = bytesToBase64(bytes)

      expect(base64).toBe('SGVsbG8=')
    })

    it('should handle empty array', () => {
      const bytes = new Uint8Array([])
      const base64 = bytesToBase64(bytes)

      expect(base64).toBe('')
    })

    it('should throw error for invalid input', () => {
      expect(() => bytesToBase64(null as any)).toThrow('Input must be a Uint8Array')
      expect(() => bytesToBase64(undefined as any)).toThrow('Input must be a Uint8Array')
      expect(() => bytesToBase64('invalid' as any)).toThrow('Input must be a Uint8Array')
    })
  })

  describe('getRandomHex', () => {
    it('should generate random hex string of specified length', async () => {
      const length = 64
      const hex = await getRandomHex(length)

      expect(hex).toMatch(/^[a-f0-9]{64}$/)
      expect(hex.length).toBe(length)
    })

    it('should generate different hex strings on each call', async () => {
      const length = 32
      const hex1 = await getRandomHex(length)
      const hex2 = await getRandomHex(length)

      expect(hex1).not.toBe(hex2)
    })

    it('should throw error for invalid length', async () => {
      await expect(getRandomHex(0)).rejects.toThrow('Length must be a positive even number')
      await expect(getRandomHex(-1)).rejects.toThrow('Length must be a positive even number')
      await expect(getRandomHex(3)).rejects.toThrow('Length must be a positive even number')
    })
  })

  describe('createHmacSignature', () => {
    it('should create HMAC signature with SHA-256', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature = await createHmacSignature('sha256', key, data, 'hex')

      expect(signature).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should create HMAC signature with base64 encoding', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature = await createHmacSignature('sha256', key, data, 'base64')

      expect(signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    })

    it('should create consistent signatures for same input', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature1 = await createHmacSignature('sha256', key, data)
      const signature2 = await createHmacSignature('sha256', key, data)

      expect(signature1).toBe(signature2)
    })

    it('should create different signatures for different keys', async () => {
      const data = 'test-data'
      const signature1 = await createHmacSignature('sha256', 'key1', data)
      const signature2 = await createHmacSignature('sha256', 'key2', data)

      expect(signature1).not.toBe(signature2)
    })

    it('should support SHA-384 algorithm', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature = await createHmacSignature('sha384', key, data, 'hex')

      expect(signature).toMatch(/^[a-f0-9]{96}$/) // SHA-384 produces 48 bytes = 96 hex chars
    })

    it('should support SHA-512 algorithm', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature = await createHmacSignature('sha512', key, data, 'hex')

      expect(signature).toMatch(/^[a-f0-9]{128}$/) // SHA-512 produces 64 bytes = 128 hex chars
    })

    it('should throw error for unsupported algorithm', async () => {
      await expect(createHmacSignature('md5', 'key', 'data')).rejects.toThrow('Unsupported algorithm')
      await expect(createHmacSignature('sha1', 'key', 'data')).rejects.toThrow('Unsupported algorithm')
    })

    it('should throw error for invalid inputs', async () => {
      await expect(createHmacSignature('sha256', null as any, 'data')).rejects.toThrow('Key must be a string')
      await expect(createHmacSignature('sha256', 'key', null as any)).rejects.toThrow('Data must be a string')
    })

    it('should handle case-insensitive algorithm names', async () => {
      const key = 'test-key'
      const data = 'test-data'
      const signature1 = await createHmacSignature('SHA256', key, data)
      const signature2 = await createHmacSignature('sha256', key, data)

      expect(signature1).toBe(signature2)
    })
  })

  describe('createSha256Hash', () => {
    it('should create SHA-256 hash', async () => {
      const data = 'test-data'
      const hash = await createSha256Hash(data, 'hex')

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should create consistent hashes for same input', async () => {
      const data = 'test-data'
      const hash1 = await createSha256Hash(data)
      const hash2 = await createSha256Hash(data)

      expect(hash1).toBe(hash2)
    })

    it('should support base64 encoding', async () => {
      const data = 'test-data'
      const hash = await createSha256Hash(data, 'base64')

      expect(hash).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    })
  })

  describe('testCryptoAvailability', () => {
    it('should return availability status', async () => {
      const status = await testCryptoAvailability()

      expect(status).toHaveProperty('randomBytes')
      expect(status).toHaveProperty('hmac')
      expect(status).toHaveProperty('environment')
      expect(typeof status.randomBytes).toBe('boolean')
      expect(typeof status.hmac).toBe('boolean')
      expect(['browser', 'nodejs', 'unknown']).toContain(status.environment)
    })

    it('should detect environment correctly', async () => {
      const status = await testCryptoAvailability()

      if (typeof window !== 'undefined' && window.crypto) {
        expect(status.environment).toBe('browser')
      } else {
        expect(status.environment).toBe('nodejs')
      }
    })

    it('should indicate crypto functions are available', async () => {
      const status = await testCryptoAvailability()

      // In a proper test environment, crypto should be available
      expect(status.randomBytes).toBe(true)
      expect(status.hmac).toBe(true)
    })
  })

  describe('integration tests', () => {
    it('should work end-to-end for signing workflow', async () => {
      // Generate random nonce
      const nonce = await getRandomHex(64)
      expect(nonce).toMatch(/^[a-f0-9]{64}$/)

      // Create message
      const message = JSON.stringify({ nonce, timestamp: Date.now() })

      // Sign message
      const signature = await createHmacSignature('sha256', 'secret-key', message, 'base64')
      expect(signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)

      // Verify signature is consistent
      const signature2 = await createHmacSignature('sha256', 'secret-key', message, 'base64')
      expect(signature).toBe(signature2)
    })

    it('should handle various data types and sizes', async () => {
      const key = 'test-key'

      // Empty string
      const emptySig = await createHmacSignature('sha256', key, '')
      expect(emptySig).toBeTruthy()

      // Large string
      const largeData = 'x'.repeat(10000)
      const largeSig = await createHmacSignature('sha256', key, largeData)
      expect(largeSig).toBeTruthy()

      // Unicode string
      const unicodeData = 'Hello 世界 🌍'
      const unicodeSig = await createHmacSignature('sha256', key, unicodeData)
      expect(unicodeSig).toBeTruthy()
    })

    it('should produce different outputs for different inputs', async () => {
      const key = 'test-key'
      const data1 = 'data1'
      const data2 = 'data2'

      const sig1 = await createHmacSignature('sha256', key, data1)
      const sig2 = await createHmacSignature('sha256', key, data2)

      expect(sig1).not.toBe(sig2)
    })
  })
})
