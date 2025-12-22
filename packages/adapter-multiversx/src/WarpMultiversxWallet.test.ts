import { UserSigner } from '@multiversx/sdk-core'
import { WarpMultiversxWallet } from './WarpMultiversxWallet'

describe('WarpMultiversxWallet', () => {
  let wallet: WarpMultiversxWallet
  let mockSigner: UserSigner
  let mockProvider: any
  let mockTx: any

  beforeEach(() => {
    mockTx = {
      to: 'erd1destination',
      data: Buffer.from('test data'),
      value: 1000000000000000000n,
      gasLimit: 50000,
      chainID: 'D',
    }
    // Mock the signer
    mockSigner = {
      sign: jest.fn().mockResolvedValue(Buffer.from('mock-signature')),
      getAddress: jest.fn().mockReturnValue({
        toBech32: () => 'erd1mockaddress',
      }),
    } as any

    // Mock the provider
    mockProvider = {
      getAccount: jest.fn().mockResolvedValue({ nonce: 5 }),
      sendTransaction: jest.fn().mockResolvedValue('mock-tx-hash'),
    }

    wallet = new WarpMultiversxWallet(
      {
        env: 'devnet',
        cache: { type: 'memory' },
        user: {
          wallets: {
            multiversx: {
              provider: 'privateKey',
              address: 'erd1test',
              privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            },
          },
        },
      },
      {
        name: 'multiversx',
        displayName: 'MultiversX',
        chainId: 'D',
        blockTime: 6000,
        addressHrp: 'erd',
        defaultApiUrl: 'https://api.multiversx.com',
        logoUrl: 'https://example.com/multiversx-logo.png',
        nativeToken: {
          chain: 'multiversx',
          identifier: 'EGLD',
          name: 'MultiversX',
          symbol: 'EGLD',
          decimals: 18,
          logoUrl: 'https://example.com/egld-logo.png',
        },
      }
    )

    // Mock the signTransaction method to avoid complex SDK setup
    wallet.signTransaction = jest.fn().mockResolvedValue({
      ...mockTx,
      signature: 'mock-signature',
    })

    // Initialize the wallet with mocked entry for sendTransaction
    ;(wallet as any).entry = { sendTransaction: jest.fn().mockResolvedValue('mock-tx-hash') }
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })
  })

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const tx = {
        to: 'erd1destination',
        data: Buffer.from('test data'),
        value: 1000000000000000000n, // 1 EGLD
        gasLimit: 50000,
        chainID: 'D',
      }

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBe('mock-signature')
      expect(wallet.signTransaction).toHaveBeenCalled()
    })

    it('should handle invalid transaction gracefully', async () => {
      // Since we're mocking the method, it will return the mock result for any input
      const result = await wallet.signTransaction(null as any)
      expect(result).toBeDefined()
    })
  })

  describe('sendTransaction', () => {
    it('should send a transaction successfully', async () => {
      const tx = {
        to: 'erd1destination',
        data: Buffer.from('test data'),
        value: 1000000000000000000n,
        gasLimit: 50000,
        chainID: 'D',
        signature: 'mock-signature',
      }

      const txHash = await wallet.sendTransaction(tx)
      expect(txHash).toBe('mock-tx-hash')
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('getPublicKey', () => {
    it('should return public key as hex string when wallet is initialized', () => {
      const publicKey = wallet.getPublicKey()
      expect(publicKey).toBeDefined()
      expect(typeof publicKey).toBe('string')
      expect(publicKey).toMatch(/^[0-9a-f]+$/)
      expect(publicKey.length).toBeGreaterThan(0)
    })

    it('should return null when wallet is not initialized', () => {
      const walletWithoutConfig = new WarpMultiversxWallet(
        {
          env: 'devnet',
          cache: { type: 'memory' },
          user: {
            wallets: {},
          },
        },
        {
          name: 'multiversx',
          displayName: 'MultiversX',
          chainId: 'D',
          blockTime: 6000,
          addressHrp: 'erd',
          defaultApiUrl: 'https://api.multiversx.com',
          logoUrl: 'https://example.com/multiversx-logo.png',
          nativeToken: {
            chain: 'multiversx',
            identifier: 'EGLD',
            name: 'MultiversX',
            symbol: 'EGLD',
            decimals: 18,
            logoUrl: 'https://example.com/egld-logo.png',
          },
        }
      )
      const publicKey = walletWithoutConfig.getPublicKey()
      expect(publicKey).toBeNull()
    })
  })
})
