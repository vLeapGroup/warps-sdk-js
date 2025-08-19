import {
  bytesToBase64,
  bytesToHex,
  CryptoProvider,
  getCryptoProvider,
  getRandomBytes,
  getRandomHex,
  setCryptoProvider,
  testCryptoAvailability,
} from './crypto'

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

const mockBrowserEnvironment = () => {
  Object.defineProperty(global, 'window', {
    value: {
      crypto: {
        getRandomValues: (array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = (i + 42) % 256
          }
          return array
        },
      },
    },
    writable: true,
    configurable: true,
  })
}

const restoreEnvironment = () => {
  delete (global as any).window
}

describe('Crypto Utilities', () => {
  let testCrypto: CryptoProvider

  beforeEach(() => {
    testCrypto = new TestCryptoProvider()
    setCryptoProvider(testCrypto)
  })

  afterEach(() => {
    restoreEnvironment()
  })

  describe('getRandomBytes', () => {
    it('should generate random bytes', async () => {
      const result = await getRandomBytes(16, testCrypto)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(16)
    })

    it('should generate different values on each call', async () => {
      const result1 = await getRandomBytes(8, testCrypto)
      const result2 = await getRandomBytes(8, testCrypto)
      expect(result1).not.toEqual(result2)
    })

    it('should throw error for invalid size', async () => {
      await expect(getRandomBytes(0, testCrypto)).rejects.toThrow('Size must be a positive integer')
      await expect(getRandomBytes(-1, testCrypto)).rejects.toThrow('Size must be a positive integer')
    })
  })

  describe('bytesToHex', () => {
    it('should convert Uint8Array to hex string', () => {
      const bytes = new Uint8Array([0, 255, 16, 32])
      const result = bytesToHex(bytes)
      expect(result).toBe('00ff1020')
    })

    it('should throw error for invalid input', () => {
      expect(() => bytesToHex(null as any)).toThrow('Input must be a Uint8Array')
    })
  })

  describe('bytesToBase64', () => {
    it('should convert Uint8Array to base64 string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111])
      const result = bytesToBase64(bytes)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getRandomHex', () => {
    it('should generate random hex string', async () => {
      const result = await getRandomHex(16, testCrypto)
      expect(typeof result).toBe('string')
      expect(result.length).toBe(16)
      expect(/^[0-9a-f]+$/.test(result)).toBe(true)
    })

    it('should throw error for invalid length', async () => {
      await expect(getRandomHex(0, testCrypto)).rejects.toThrow('Length must be a positive even number')
      await expect(getRandomHex(15, testCrypto)).rejects.toThrow('Length must be a positive even number')
    })
  })

  describe('Crypto Provider Management', () => {
    it('should set and get custom crypto provider', () => {
      const customProvider = new TestCryptoProvider()
      setCryptoProvider(customProvider)
      const retrieved = getCryptoProvider()
      expect(retrieved).toBe(customProvider)
    })

    it('should create crypto provider automatically in browser environment', () => {
      mockBrowserEnvironment()
      setCryptoProvider(null as any)
      const provider = getCryptoProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.getRandomBytes).toBe('function')
    })

    it('should throw error when no provider is available', () => {
      setCryptoProvider(null as any)
      restoreEnvironment()
      // Mock process to be undefined to ensure no Node.js detection
      const originalProcess = global.process
      delete (global as any).process

      expect(() => getCryptoProvider()).toThrow('No compatible crypto provider found')

      // Restore process
      global.process = originalProcess
    })
  })

  describe('testCryptoAvailability', () => {
    it('should detect environment correctly', async () => {
      const status = await testCryptoAvailability()
      expect(['browser', 'nodejs', 'unknown']).toContain(status.environment)
    })

    it('should indicate crypto functions are available when provider is set', async () => {
      const status = await testCryptoAvailability()
      expect(status.randomBytes).toBe(true)
    })
  })

  describe('integration', () => {
    it('should work end-to-end for random generation', async () => {
      const nonce = await getRandomHex(64, testCrypto)

      expect(typeof nonce).toBe('string')
      expect(nonce.length).toBe(64)
    })
  })
})
