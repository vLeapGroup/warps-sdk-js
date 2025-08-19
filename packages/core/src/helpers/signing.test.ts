import { CryptoProvider } from './crypto'
import { createAuthMessage, createHttpAuthHeaders, createSignableMessage, parseSignedMessage, validateSignedMessage } from './signing'

class TestCryptoProvider implements CryptoProvider {
  private counter = 0

  async getRandomBytes(size: number): Promise<Uint8Array> {
    this.counter++
    const array = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      array[i] = (i + this.counter) % 256
    }
    return array
  }
}

describe('Signing Utilities', () => {
  let testCrypto: CryptoProvider

  beforeEach(() => {
    testCrypto = new TestCryptoProvider()
  })

  describe('createSignableMessage', () => {
    it('should create a valid signable message', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const purpose = 'test-purpose'

      const result = await createSignableMessage(walletAddress, purpose, testCrypto)

      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('nonce')
      expect(result).toHaveProperty('expiresAt')

      expect(result.nonce.length).toBe(64)
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now())

      const parsedMessage = JSON.parse(result.message)
      expect(parsedMessage.wallet).toBe(walletAddress)
      expect(parsedMessage.purpose).toBe(purpose)
    })

    it('should create message with custom expiration', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const purpose = 'test-purpose'
      const expiresInMinutes = 10

      const result = await createSignableMessage(walletAddress, purpose, testCrypto, expiresInMinutes)

      const expectedExpiry = Date.now() + expiresInMinutes * 60 * 1000
      const actualExpiry = new Date(result.expiresAt).getTime()
      expect(actualExpiry).toBeGreaterThan(Date.now())
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000)
    })
  })

  describe('createAuthMessage', () => {
    it('should create auth message with default purpose', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const appName = 'test-app'

      const result = await createAuthMessage(walletAddress, appName, testCrypto)

      const parsedMessage = JSON.parse(result.message)
      expect(parsedMessage.purpose).toContain(appName)
      expect(parsedMessage.purpose).toContain('prove-wallet-ownership')
    })

    it('should create auth message with custom purpose', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const appName = 'test-app'
      const customPurpose = 'custom-purpose'

      const result = await createAuthMessage(walletAddress, appName, testCrypto, customPurpose)

      const parsedMessage = JSON.parse(result.message)
      expect(parsedMessage.purpose).toBe(customPurpose)
    })
  })

  describe('createHttpAuthHeaders', () => {
    it('should create HTTP auth headers', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const appName = 'test-app'
      const mockSignFunction = jest.fn().mockResolvedValue('mock-signature')

      const headers = await createHttpAuthHeaders(walletAddress, mockSignFunction, appName, testCrypto)

      expect(headers['X-Signer-Wallet']).toBe(walletAddress)
      expect(headers['X-Signer-Signature']).toBe('mock-signature')
      expect(headers['X-Signer-Nonce']).toBeDefined()
      expect(headers['X-Signer-ExpiresAt']).toBeDefined()

      expect(mockSignFunction).toHaveBeenCalledTimes(1)
      const signedMessage = mockSignFunction.mock.calls[0][0]
      expect(signedMessage).toContain(walletAddress)
    })
  })

  describe('parseSignedMessage', () => {
    it('should parse valid signed message', () => {
      const message = JSON.stringify({
        wallet: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
        nonce: 'test-nonce',
        expiresAt: '2023-12-31T23:59:59.999Z',
        purpose: 'test-purpose',
      })

      const result = parseSignedMessage(message)

      expect(result.wallet).toBe('erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3')
      expect(result.nonce).toBe('test-nonce')
      expect(result.purpose).toBe('test-purpose')
    })

    it('should throw error for invalid JSON', () => {
      expect(() => parseSignedMessage('invalid-json')).toThrow('Failed to parse signed message')
    })

    it('should throw error for missing required fields', () => {
      const incompleteMessage = JSON.stringify({
        wallet: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
        nonce: 'test-nonce',
      })

      expect(() => parseSignedMessage(incompleteMessage)).toThrow('Invalid signed message: missing required fields')
    })
  })

  describe('validateSignedMessage', () => {
    it('should return true for valid expiration time', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString()
      const result = validateSignedMessage(futureTime)
      expect(result).toBe(true)
    })

    it('should return false for expired time', () => {
      const pastTime = new Date(Date.now() - 60000).toISOString()
      const result = validateSignedMessage(pastTime)
      expect(result).toBe(false)
    })
  })

  describe('integration', () => {
    it('should work end-to-end with manual signing', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const appName = 'test-app'
      const mockSignFunction = jest.fn().mockResolvedValue('mock-signature')

      const headers = await createHttpAuthHeaders(walletAddress, mockSignFunction, appName, testCrypto)

      expect(headers['X-Signer-Wallet']).toBe(walletAddress)
      expect(headers['X-Signer-Signature']).toBe('mock-signature')

      const signedMessage = mockSignFunction.mock.calls[0][0]
      const parsedMessage = parseSignedMessage(signedMessage)
      expect(parsedMessage.wallet).toBe(walletAddress)
      expect(parsedMessage.purpose).toContain(appName)

      const isValid = validateSignedMessage(headers['X-Signer-ExpiresAt'])
      expect(isValid).toBe(true)
    })

    it('should work with arbitrary message signing', async () => {
      const walletAddress = 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3'
      const purpose = 'arbitrary-purpose'

      const { message, nonce, expiresAt } = await createSignableMessage(walletAddress, purpose, testCrypto)

      const parsedMessage = JSON.parse(message)
      expect(parsedMessage.wallet).toBe(walletAddress)
      expect(parsedMessage.nonce).toBe(nonce)
      expect(parsedMessage.purpose).toBe(purpose)

      const isValid = validateSignedMessage(expiresAt)
      expect(isValid).toBe(true)
    })
  })
})
