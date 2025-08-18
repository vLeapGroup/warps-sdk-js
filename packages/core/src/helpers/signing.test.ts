import { createHmacSignature } from './crypto'
import {
  createAuthHeaders,
  createAuthMessage,
  createHttpAuthHeaders,
  createSignableMessage,
  parseSignedMessage,
  validateSignedMessage,
} from './signing'

describe('Signing Utilities', () => {
  describe('createSignableMessage', () => {
    it('should create a valid signable message with default expiration', async () => {
      const walletAddress = '0x1234567890abcdef'
      const purpose = 'test-purpose'

      const { message, nonce, expiresAt } = await createSignableMessage(walletAddress, purpose)

      expect(nonce).toMatch(/^[a-f0-9]{64}$/)
      expect(expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      const parsed = JSON.parse(message)
      expect(parsed.wallet).toBe(walletAddress)
      expect(parsed.nonce).toBe(nonce)
      expect(parsed.expiresAt).toBe(expiresAt)
      expect(parsed.purpose).toBe(purpose)
    })

    it('should create a valid signable message with custom expiration', async () => {
      const walletAddress = '0x1234567890abcdef'
      const purpose = 'test-purpose'
      const expiresInMinutes = 10

      const { message, nonce, expiresAt } = await createSignableMessage(walletAddress, purpose, expiresInMinutes)

      const parsed = JSON.parse(message)
      const expirationTime = new Date(expiresAt).getTime()
      const expectedExpiration = Date.now() + expiresInMinutes * 60 * 1000

      // Allow 1 second tolerance for test execution time
      expect(expirationTime).toBeGreaterThan(expectedExpiration - 1000)
      expect(expirationTime).toBeLessThan(expectedExpiration + 1000)
    })
  })

  describe('createAuthMessage', () => {
    it('should create a valid auth message with default purpose', async () => {
      const walletAddress = '0x1234567890abcdef'
      const appName = 'test-adapter'

      const { message, nonce, expiresAt } = await createAuthMessage(walletAddress, appName)

      expect(nonce).toMatch(/^[a-f0-9]{64}$/)
      expect(expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      const parsed = JSON.parse(message)
      expect(parsed.wallet).toBe(walletAddress)
      expect(parsed.nonce).toBe(nonce)
      expect(parsed.expiresAt).toBe(expiresAt)
      expect(parsed.purpose).toBe(`prove-wallet-ownership for app "${appName}"`)
    })

    it('should create a valid auth message with custom purpose', async () => {
      const walletAddress = '0x1234567890abcdef'
      const appName = 'test-adapter'
      const customPurpose = 'custom-purpose'

      const { message, nonce, expiresAt } = await createAuthMessage(walletAddress, appName, customPurpose)

      const parsed = JSON.parse(message)
      expect(parsed.purpose).toBe(customPurpose)
    })
  })

  describe('createAuthHeaders', () => {
    it('should create valid auth headers', () => {
      const walletAddress = '0x1234567890abcdef'
      const signature = 'test-signature'
      const nonce = 'test-nonce'
      const expiresAt = '2023-01-01T00:00:00.000Z'

      const headers = createAuthHeaders(walletAddress, signature, nonce, expiresAt)

      expect(headers['X-Signer-Wallet']).toBe(walletAddress)
      expect(headers['X-Signer-Signature']).toBe(signature)
      expect(headers['X-Signer-Nonce']).toBe(nonce)
      expect(headers['X-Signer-ExpiresAt']).toBe(expiresAt)
    })
  })

  describe('createHttpAuthHeaders', () => {
    it('should create HTTP auth headers with signing function', async () => {
      const walletAddress = '0x1234567890abcdef'
      const appName = 'test-adapter'

      // Mock signing function
      const mockSignMessage = jest.fn().mockResolvedValue('mock-signature')

      const headers = await createHttpAuthHeaders(walletAddress, mockSignMessage, appName)

      expect(headers['X-Signer-Wallet']).toBe(walletAddress)
      expect(headers['X-Signer-Signature']).toBe('mock-signature')
      expect(headers['X-Signer-Nonce']).toMatch(/^[a-f0-9]{64}$/)
      expect(headers['X-Signer-ExpiresAt']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(mockSignMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('validateSignedMessage', () => {
    it('should validate a non-expired message', () => {
      const futureExpiresAt = new Date(Date.now() + 60000).toISOString() // 1 minute from now
      expect(validateSignedMessage(futureExpiresAt)).toBe(true)
    })

    it('should reject an expired message', () => {
      const pastExpiresAt = new Date(Date.now() - 60000).toISOString() // 1 minute ago
      expect(validateSignedMessage(pastExpiresAt)).toBe(false)
    })
  })

  describe('parseSignedMessage', () => {
    it('should parse a valid signed message', () => {
      const validMessage = JSON.stringify({
        wallet: '0x1234567890abcdef',
        nonce: 'test-nonce',
        expiresAt: '2023-01-01T00:00:00.000Z',
        purpose: 'test-purpose',
      })

      const parsed = parseSignedMessage(validMessage)
      expect(parsed.wallet).toBe('0x1234567890abcdef')
      expect(parsed.nonce).toBe('test-nonce')
      expect(parsed.expiresAt).toBe('2023-01-01T00:00:00.000Z')
      expect(parsed.purpose).toBe('test-purpose')
    })

    it('should throw error for invalid JSON', () => {
      expect(() => parseSignedMessage('invalid-json')).toThrow('Failed to parse signed message')
    })

    it('should throw error for missing required fields', () => {
      const invalidMessage = JSON.stringify({
        wallet: '0x1234567890abcdef',
        // missing nonce, expiresAt, purpose
      })

      expect(() => parseSignedMessage(invalidMessage)).toThrow('Invalid signed message: missing required fields')
    })
  })

  describe('integration', () => {
    it('should work end-to-end with manual signing for HTTP auth', async () => {
      const walletAddress = '0x1234567890abcdef'
      const appName = 'test-adapter'
      const privateKey = 'test-secret-key'

      const { message, nonce, expiresAt } = await createAuthMessage(walletAddress, appName)

      // Manual HMAC signing (simulating adapter-specific logic)
      const signature = await createHmacSignature('sha256', privateKey, message, 'base64')

      const headers = createAuthHeaders(walletAddress, signature, nonce, expiresAt)

      expect(headers['X-Signer-Wallet']).toBe(walletAddress)
      expect(headers['X-Signer-Signature']).toBe(signature)
      expect(headers['X-Signer-Nonce']).toBe(nonce)
      expect(headers['X-Signer-ExpiresAt']).toBe(expiresAt)
    })

    it('should work with arbitrary message signing', async () => {
      const walletAddress = '0x1234567890abcdef'
      const purpose = 'arbitrary-proof'
      const privateKey = 'test-secret-key'

      const { message, nonce, expiresAt } = await createSignableMessage(walletAddress, purpose, 10)

      // Manual HMAC signing (simulating adapter-specific logic)
      const signature = await createHmacSignature('sha256', privateKey, message, 'base64')

      // Parse and validate
      const parsed = parseSignedMessage(message)
      expect(parsed.wallet).toBe(walletAddress)
      expect(parsed.purpose).toBe(purpose)
      expect(validateSignedMessage(expiresAt)).toBe(true)
    })
  })
})
