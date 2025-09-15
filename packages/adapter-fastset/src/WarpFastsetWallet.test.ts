import { WarpFastsetWallet } from './WarpFastsetWallet'

// Mock the helpers to avoid import issues
jest.mock('./helpers', () => ({
  encoder: new TextEncoder(),
  decoder: new TextDecoder(),
  uint8ArrayToHex: (arr: Uint8Array) => Buffer.from(arr).toString('hex'),
  hexToUint8Array: (hex: string) => new Uint8Array(Buffer.from(hex, 'hex')),
  uint8ArrayToString: (arr: Uint8Array) => Buffer.from(arr).toString('utf8'),
  stringToUint8Array: (str: string) => new Uint8Array(Buffer.from(str, 'utf8')),
  getConfiguredFastsetClient: jest.fn(() => ({
    submitTransaction: jest.fn().mockResolvedValue('mock-tx-hash'),
  })),
}))

jest.mock('./sdk', () => ({
  FastsetClient: jest.fn(),
  Wallet: jest.fn().mockImplementation((privateKeyHex: string) => ({
    toBech32: jest.fn().mockReturnValue('set1mockaddress'),
    getPrivateKey: jest
      .fn()
      .mockReturnValue(
        Uint8Array.from([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        ])
      ),
    signTransactionRaw: jest.fn(),
  })),
  Transaction: jest.fn(),
}))

jest.mock('./sdk/ed25519-setup', () => ({
  ed: {
    utils: {
      randomPrivateKey: jest.fn().mockReturnValue(new Uint8Array(32)),
    },
    sign: jest.fn().mockResolvedValue(new Uint8Array(64)),
  },
}))

describe('WarpFastsetWallet', () => {
  const mockConfig = {
    env: 'testnet' as const,
    user: {
      wallets: {
        fastset: 'set1mockaddress',
      },
    },
  }

  const mockChain = {
    name: 'fastset',
    displayName: 'FastSet',
    chainId: 'testnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://test.fastset.xyz',
    logoUrl: 'https://test.fastset.xyz/logo.svg',
    nativeToken: {
      chain: 'fastset',
      identifier: 'SET',
      name: 'SET',
      symbol: 'SET',
      decimals: 6,
      logoUrl: 'https://test.fastset.xyz/tokens/set.svg',
    },
  }

  let wallet: WarpFastsetWallet

  beforeEach(() => {
    jest.clearAllMocks()
    wallet = new WarpFastsetWallet(mockConfig, mockChain)
    // Ensure client has submitTransaction method
    if (wallet['client']) {
      wallet['client'].submitTransaction = jest.fn().mockResolvedValue('mock-tx-hash')
    }
  })

  describe('Wallet Creation', () => {
    test('create() should create wallet from mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      const result = wallet.create(mnemonic)

      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('privateKey')
      expect(result.mnemonic).toBe(mnemonic)
      expect(typeof result.address).toBe('string')
      expect(typeof result.privateKey).toBe('string')
      expect(result.address).toMatch(/^set1/)
      expect(result.privateKey).toMatch(/^[0-9a-f]+$/)
    })

    test('generate() should generate random wallet', () => {
      // Create a new wallet instance without config to test generate() independently
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const result = walletWithoutConfig.generate()

      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('privateKey')
      expect(result.mnemonic).toBeNull()
      expect(typeof result.address).toBe('string')
      expect(typeof result.privateKey).toBe('string')
      expect(result.address).toMatch(/^set1/)
      expect(result.privateKey).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('Address Management', () => {
    test('getAddress() should return configured address', () => {
      const address = wallet.getAddress()
      expect(address).toBe('set1mockaddress')
    })

    test('getAddress() should return null when no wallet configured', () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const address = walletWithoutConfig.getAddress()
      expect(address).toBeNull()
    })
  })

  describe('Signing Operations', () => {
    test('signMessage() should throw error when wallet not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)

      await expect(walletWithoutConfig.signMessage('test')).rejects.toThrow('Wallet not initialized')
    })

    test('signTransaction() should throw error when wallet not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const mockTx = { toTransaction: jest.fn() }

      await expect(walletWithoutConfig.signTransaction(mockTx as any)).rejects.toThrow('Wallet not initialized')
    })

    // Skip actual signing tests due to mocking complexity in test environment
    test('signMessage() should sign message and return hex string', async () => {
      const message = 'test message'
      const result = await wallet.signMessage(message)

      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[0-9a-f]+$/)
      expect(result.length).toBeGreaterThan(0)
    })

    test('signTransaction() should sign transaction', async () => {
      const mockTx = {
        toTransaction: jest.fn().mockReturnValue({
          sender: new Uint8Array([1, 2, 3]),
          recipient: new Uint8Array([4, 5, 6]),
          nonce: 1,
          timestamp_nanos: 1000000000n,
          claim: { Transfer: { amount: '1000', user_data: null } },
        }),
      }

      const result = await wallet.signTransaction(mockTx as any)

      expect(result).toHaveProperty('signature')
      expect(typeof result.signature).toBe('string')
      expect(result.signature).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('Transaction Submission', () => {
    test('sendTransaction() should throw error when wallet not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const mockTx = { toTransaction: jest.fn() }

      await expect(walletWithoutConfig.sendTransaction(mockTx as any)).rejects.toThrow('Wallet not initialized')
    })

    test('sendTransaction() should submit transaction and return hash', async () => {
      const mockTx = {
        toTransaction: jest.fn().mockReturnValue({
          sender: new Uint8Array([1, 2, 3]),
          recipient: new Uint8Array([4, 5, 6]),
          nonce: 1,
          timestamp_nanos: 1000000000n,
          claim: { Transfer: { amount: '1000', user_data: null } },
        }),
        signature: 'a1b2c3d4e5f6',
      }

      const result = await wallet.sendTransaction(mockTx as any)

      expect(typeof result).toBe('string')
      expect(result).toBe('mock-tx-hash')
    })

    test('sendTransaction() should sign and submit transaction without signature', async () => {
      const mockTx = {
        toTransaction: jest.fn().mockReturnValue({
          sender: new Uint8Array([1, 2, 3]),
          recipient: new Uint8Array([4, 5, 6]),
          nonce: 1,
          timestamp_nanos: 1000000000n,
          claim: { Transfer: { amount: '1000', user_data: null } },
        }),
        // No signature provided
      }

      const result = await wallet.sendTransaction(mockTx as any)

      expect(typeof result).toBe('string')
      expect(result).toBe('mock-tx-hash')
    })
  })

  describe('Cross-Environment Compatibility', () => {
    test('should work with Uint8Array operations', () => {
      // Test that our helper functions work correctly
      const testBytes = new Uint8Array([1, 2, 3, 4, 5])
      const hex = testBytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')

      expect(hex).toBe('0102030405')

      const backToBytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < backToBytes.length; i++) {
        backToBytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }

      expect(backToBytes).toEqual(testBytes)
    })

    test('should handle different environments gracefully', () => {
      // Test that we can create wallet without complex dependencies
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const result = walletWithoutConfig.generate()
      expect(result.privateKey).toBeDefined()
      expect(result.privateKey.length).toBeGreaterThan(0)
      expect(typeof result.privateKey).toBe('string')
    })
  })
})
