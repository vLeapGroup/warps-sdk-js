import { WarpFastsetWallet } from './WarpFastsetWallet'
import { Transaction } from './sdk/Transaction'

describe('WarpFastsetWallet', () => {
  let wallet: WarpFastsetWallet
  let mockWallet: any
  let mockClient: any

  beforeEach(() => {
    // Mock the wallet
    mockWallet = {
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
      toBech32: jest.fn().mockReturnValue('set1mockaddress'),
    }

    // Mock the client
    mockClient = {
      submitTransaction: jest.fn().mockResolvedValue({
        transaction_hash: 'mock-tx-hash',
      }),
    }

    wallet = new WarpFastsetWallet(mockWallet, mockClient)
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
      const recipient = { FastSet: new Uint8Array(32) }
      const claim = { Transfer: { recipient, amount: '100', user_data: new Uint8Array(32) } }
      const tx = new Transaction(mockWallet.publicKey, recipient, 1, claim)

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBeDefined()
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('sendTransaction', () => {
    it('should send a transaction successfully', async () => {
      const recipient = { FastSet: new Uint8Array(32) }
      const claim = { Transfer: { recipient, amount: '100', user_data: new Uint8Array(32) } }
      const tx = new Transaction(mockWallet.publicKey, recipient, 1, claim)

      const txHash = await wallet.sendTransaction(tx)
      expect(txHash).toBe('mock-tx-hash')
      expect(mockClient.submitTransaction).toHaveBeenCalled()
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })
})
