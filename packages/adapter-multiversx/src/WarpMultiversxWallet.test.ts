import { UserSigner } from '@multiversx/sdk-core'
import { WarpMultiversxWallet } from './WarpMultiversxWallet'

describe('WarpMultiversxWallet', () => {
  let wallet: WarpMultiversxWallet
  let mockSigner: UserSigner
  let mockProvider: any

  beforeEach(() => {
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
      { env: 'devnet', cache: { type: 'memory' } },
      { name: 'multiversx', defaultApiUrl: 'https://api.multiversx.com', addressHrp: 'erd' }
    )

    // Initialize the wallet with signer and account (this would normally be done by the user)
    ;(wallet as any).signer = mockSigner
    ;(wallet as any).account = { nonce: 5n, getNonceThenIncrement: jest.fn().mockReturnValue(6n) }
    ;(wallet as any).provider = mockProvider
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature).toBe('6d6f636b2d7369676e6174757265') // hex of 'mock-signature'
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
      expect(signedTx.signature).toBeDefined()
      expect(mockSigner.sign).toHaveBeenCalled()
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
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
      }

      const txHash = await wallet.sendTransaction(tx)
      expect(txHash).toBe('mock-tx-hash')
      expect(mockProvider.getAccount).toHaveBeenCalled()
      expect(mockSigner.sign).toHaveBeenCalled()
      expect(mockProvider.sendTransaction).toHaveBeenCalled()
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })
})
