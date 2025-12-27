import { CoinbaseWalletProvider } from './CoinbaseWalletProvider'
import { CoinbaseProviderConfig } from './types'
import { CdpClient } from '@coinbase/cdp-sdk'

jest.mock('@coinbase/cdp-sdk')

describe('CoinbaseWalletProvider', () => {
  const mockWalletSecret = 'test-wallet-secret'
  const mockAccountId = 'test-account-id'
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockPublicKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

  let config: any
  let chain: any
  let coinbaseConfig: CoinbaseProviderConfig
  let provider: CoinbaseWalletProvider
  let mockClient: jest.Mocked<CdpClient>

  beforeEach(() => {
    chain = {
      name: 'ethereum',
      defaultApiUrl: 'https://rpc.sepolia.org',
      addressHrp: '0x',
    }
    config = {
      env: 'testnet',
      user: {
        wallets: {
          [chain.name]: {
            provider: 'coinbase',
            address: mockAddress,
            externalId: null,
          },
        },
      },
    }
    coinbaseConfig = {
      apiKeyId: 'test-api-key-id',
      apiKeySecret: 'test-api-key-secret',
      walletSecret: mockWalletSecret,
    }

    mockClient = {
      evm: {
        getAccount: jest.fn(),
        signTransaction: jest.fn(),
        signMessage: jest.fn(),
        createAccount: jest.fn(),
        sendTransaction: jest.fn(),
        listAccounts: jest.fn(),
      },
    } as any

    ;(CdpClient as jest.MockedClass<typeof CdpClient>).mockImplementation(() => mockClient)

    provider = new CoinbaseWalletProvider(config, chain, coinbaseConfig)
  })

  describe('getAddress', () => {
    it('should return address from Coinbase account', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
        publicKey: mockPublicKey,
      })

      const address = await provider.getAddress()
      expect(address).toBe(mockAddress)
      expect(mockClient.evm.getAccount).toHaveBeenCalledWith({ address: mockAddress })
    })

    it('should return null on error', async () => {
      mockClient.evm.getAccount.mockRejectedValue(new Error('API error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const address = await provider.getAddress()
      expect(address).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getPublicKey', () => {
    it('should return public key from Coinbase account', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
        publicKey: mockPublicKey,
      })

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBe(mockPublicKey)
    })

    it('should return null if public key is not available', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBeNull()
    })

    it('should return null on error', async () => {
      mockClient.evm.getAccount.mockRejectedValue(new Error('API error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBeNull()

      consoleSpy.mockRestore()
    })
  })

  describe('signTransaction', () => {
    it('should sign transaction using Coinbase API', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000',
        data: '0x',
      }
      const mockSignedTx = '0xabcdef1234567890...'

      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signTransaction.mockResolvedValue({
        signedTransaction: mockSignedTx,
      })

      const result = await provider.signTransaction(mockTx)
      expect(result).toEqual({
        ...mockTx,
        signature: mockSignedTx,
      })
      expect(mockClient.evm.signTransaction).toHaveBeenCalledWith({
        address: mockAddress,
        body: { transaction: mockTx },
      })
    })

    it('should throw error if API does not return signed transaction', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signTransaction.mockResolvedValue({})

      await expect(provider.signTransaction({})).rejects.toThrow(
        'Coinbase API did not return signed transaction'
      )
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signTransaction.mockRejectedValue(new Error('API error'))

      await expect(provider.signTransaction({})).rejects.toThrow(
        'CoinbaseWalletProvider: Failed to sign transaction'
      )
    })
  })

  describe('signMessage', () => {
    it('should sign message using Coinbase API', async () => {
      const message = 'Hello World'
      const mockSignedMessage = '0xsignedmessage123...'

      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signMessage.mockResolvedValue({
        signedMessage: mockSignedMessage,
      })

      const result = await provider.signMessage(message)
      expect(result).toBe(mockSignedMessage)
      expect(mockClient.evm.signMessage).toHaveBeenCalledWith({
        address: mockAddress,
        body: { message },
      })
    })

    it('should throw error if API does not return signed message', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signMessage.mockResolvedValue({})

      await expect(provider.signMessage('test')).rejects.toThrow(
        'Coinbase API did not return signed message'
      )
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signMessage.mockRejectedValue(new Error('API error'))

      await expect(provider.signMessage('test')).rejects.toThrow(
        'CoinbaseWalletProvider: Failed to sign message'
      )
    })
  })

  describe('create', () => {
    it('should throw error indicating mnemonic is not supported', async () => {
      await expect(provider.create('test mnemonic')).rejects.toThrow(
        'CoinbaseWalletProvider: create() with mnemonic is not supported'
      )
    })
  })

  describe('generate', () => {
    it('should create a new Coinbase account', async () => {
      mockClient.evm.createAccount.mockResolvedValue({
        address: '0xnewaddress',
      })

      const result = await provider.generate()
      expect(result).toEqual({
        provider: 'coinbase',
        address: '0xnewaddress',
        externalId: null,
        mnemonic: null,
        privateKey: null,
      })
      expect(mockClient.evm.createAccount).toHaveBeenCalledWith({})
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.createAccount.mockRejectedValue(new Error('API error'))

      await expect(provider.generate()).rejects.toThrow(
        'CoinbaseWalletProvider: Failed to generate account'
      )
    })
  })
})
