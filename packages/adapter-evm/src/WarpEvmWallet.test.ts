import { WarpEvmWallet } from './WarpEvmWallet'

describe('WarpEvmWallet', () => {
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
  let wallet: WarpEvmWallet
  let config: any
  let chain: any

  beforeEach(() => {
    chain = {
      name: 'ethereum',
      defaultApiUrl: 'https://rpc.sepolia.org',
      addressHrp: '0x'
    }
    config = {
      env: 'testnet',
      user: {
        wallets: {
          [chain.name]: {
            provider: 'privateKey',
            privateKey,
          },
        },
      },
    }
    wallet = new WarpEvmWallet(config, chain)
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })

    it('should sign different messages with different signatures', async () => {
      const message1 = 'Message 1'
      const message2 = 'Message 2'
      const signature1 = await wallet.signMessage(message1)
      const signature2 = await wallet.signMessage(message2)
      expect(signature1).not.toBe(signature2)
    })
  })

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
        value: 0,
        gasLimit: 21000,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
        nonce: 0,
        chainId: 11155111,
      }

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBeDefined()
      expect(typeof signedTx.signature).toBe('string')
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('sendTransaction', () => {
    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })

    // Note: sendTransaction would require a real RPC connection for full testing
    // In a real test environment, you might want to mock the ethers provider
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
      const walletWithoutConfig = new WarpEvmWallet(
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

  describe('read-only wallet', () => {
    const readOnlyAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    let readOnlyWallet: WarpEvmWallet

    beforeEach(() => {
      const readOnlyConfig = {
        env: 'testnet',
        user: {
          wallets: {
            [chain.name]: readOnlyAddress,
          },
        },
      }
      readOnlyWallet = new WarpEvmWallet(readOnlyConfig, chain)
    })

    it('should initialize read-only wallet without errors', () => {
      expect(readOnlyWallet).toBeDefined()
    })

    it('should return address for read-only wallet', () => {
      const address = readOnlyWallet.getAddress()
      expect(address).toBe(readOnlyAddress)
    })

    it('should throw error when trying to sign transaction with read-only wallet', async () => {
      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
        value: 0,
        gasLimit: 21000,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
        nonce: 0,
        chainId: 11155111,
      }

      await expect(readOnlyWallet.signTransaction(tx)).rejects.toThrow(`Wallet (${chain.name}) is read-only`)
    })

    it('should throw error when trying to sign message with read-only wallet', async () => {
      await expect(readOnlyWallet.signMessage('Hello')).rejects.toThrow(`Wallet (${chain.name}) is read-only`)
    })

  })

  describe('generate', () => {
    it('should generate a new wallet with mnemonic', async () => {
      const result = await wallet.generate('mnemonic')
      expect(result).toBeDefined()
      expect(result.address).toBeDefined()
      expect(result.mnemonic).not.toBeNull()
      expect(result.provider).toBe('mnemonic')
    })

    it('should generate 24-word mnemonic', async () => {
      const result = await wallet.generate('mnemonic')
      expect(result.mnemonic).not.toBeNull()
      if (result.mnemonic) {
        const words = result.mnemonic.split(' ')
        expect(words.length).toBe(24)
      }
    })
  })
})
