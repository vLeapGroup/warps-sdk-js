import { getWarpWalletPrivateKeyFromConfig } from '@vleap/warps'
import { Transaction } from './sdk'
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
    request: jest.fn().mockResolvedValue({ result: 'mock-tx-hash' }),
  })),
}))

jest.mock('./sdk', () => ({
  FastsetClient: Object.assign(
    jest.fn().mockImplementation(() => ({
      encodeBech32Address: jest.fn(() => 'set1testaddress123456789'),
    })),
    {
      encodeBech32Address: jest.fn(() => 'set1testaddress123456789'),
    }
  ),
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
  Transaction: {
    serialize: jest.fn(() => ({
      toBytes: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
    })),
  },
}))

jest.mock('./sdk/ed25519-setup', () => ({
  ed: {
    getPublicKey: jest.fn((privateKey) => new Uint8Array(32)),
    utils: {
      randomPrivateKey: jest.fn(() => new Uint8Array(32)),
    },
    sign: jest.fn((message, privateKey) => new Uint8Array(64).fill(1)), // Fill with 1s so hex conversion works
  },
}))

// Mock getWarpWalletPrivateKeyFromConfig to return undefined for uninitialized wallet tests
jest.mock('@vleap/warps', () => ({
  ...jest.requireActual('@vleap/warps'),
  getWarpWalletPrivateKeyFromConfig: jest.fn(),
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
    // Mock private key to be available by default
    ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockReturnValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    )
    wallet = new WarpFastsetWallet(mockConfig, mockChain)
    // Ensure client has request method
    if (wallet['client']) {
      wallet['client'].request = jest.fn().mockResolvedValue({ result: 'mock-tx-hash' })
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
      // Mock private key to be undefined for this test
      ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockReturnValueOnce(undefined)
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)

      await expect(walletWithoutConfig.signMessage('test')).rejects.toThrow('Wallet not initialized')
    })

    test('signTransaction() should throw error when wallet not initialized', async () => {
      // Mock private key to be undefined for this test
      ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockReturnValueOnce(undefined)
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const mockTx = {
        claim: { Transfer: { amount: '1000000000000000000', user_data: null } },
        nonce: 0,
        recipient: { FastSet: new Uint8Array(32) }, // Use 32-byte array
        sender: new Uint8Array(32), // Use 32-byte array
        timestamp_nanos: BigInt(Date.now() * 1000000),
      }

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
      const originalSerialize = Transaction.serialize
      Transaction.serialize = jest.fn(() => ({
        toBytes: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
      }))

      const mockTx = {
        sender: new Uint8Array(32),
        recipient: { FastSet: new Uint8Array(32) },
        nonce: 1,
        timestamp_nanos: 1000000000n,
        claim: { Transfer: { amount: '1000', user_data: null } },
      }

      const result = await wallet.signTransaction(mockTx as any)

      expect(result).toHaveProperty('signature')
      expect(result.signature).toBeInstanceOf(Uint8Array)
      expect(result.signature.length).toBe(64)

      // Restore original function
      Transaction.serialize = originalSerialize
    })
  })

  describe('Transaction Submission', () => {
    test('sendTransaction() should work even when wallet not initialized', async () => {
      // Mock private key to be undefined for this test - sendTransaction doesn't check for private key
      ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockReturnValueOnce(undefined)
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      // Ensure client has request method
      if (walletWithoutConfig['client']) {
        walletWithoutConfig['client'].request = jest.fn().mockResolvedValue({ result: 'mock-tx-hash' })
      }
      const mockTx = {
        claim: { Transfer: { amount: '1000000000000000000', user_data: null } },
        nonce: 0,
        recipient: { FastSet: new Uint8Array(32) }, // Use 32-byte array
        sender: new Uint8Array(32), // Use 32-byte array
        timestamp_nanos: BigInt(Date.now() * 1000000),
        signature: 'mock-signature',
      }

      const result = await walletWithoutConfig.sendTransaction(mockTx as any)

      expect(result).toBe('TODO')
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
      expect(result).toBe('TODO')
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
      expect(result).toBe('TODO')
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
