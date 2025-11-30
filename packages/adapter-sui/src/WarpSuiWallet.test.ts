import { WarpSuiWallet } from './WarpSuiWallet'

describe('WarpSuiWallet', () => {
  let wallet: WarpSuiWallet
  let config: any
  let chain: any

  beforeEach(() => {
    chain = {
      name: 'sui',
      defaultApiUrl: 'https://fullnode.testnet.sui.io',
      addressHrp: '0x',
    }
    // Use a valid 32-byte hex private key for Ed25519
    config = {
      env: 'testnet',
      user: {
        wallets: {
          [chain.name]: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
      },
    }
    wallet = new WarpSuiWallet(config, chain)

    // Mock the client methods to avoid real network calls
    wallet['client'] = {
      signAndExecuteTransaction: jest.fn().mockResolvedValue({ digest: 'mock-digest' }),
    } as any
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
        kind: 'ProgrammableTransaction',
        inputs: [],
        transactions: [],
      }

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBeDefined()
      expect(typeof signedTx.signature).toBe('string')
      expect(signedTx.signature.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('sendTransaction', () => {
    it('should send a transaction successfully', async () => {
      const tx = {
        kind: 'ProgrammableTransaction',
        inputs: [],
        transactions: [],
        signature: 'mock-signature',
      }

      const digest = await wallet.sendTransaction(tx)
      expect(digest).toBe('mock-digest')
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
      const walletWithoutConfig = new WarpSuiWallet(
        {
          env: 'testnet',
          user: {
            wallets: {},
          },
        },
        chain
      )
      const publicKey = walletWithoutConfig.getPublicKey()
      expect(publicKey).toBeNull()
    })
  })
})
