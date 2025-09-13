import { WarpSuiWallet } from './WarpSuiWallet'

describe('WarpSuiWallet', () => {
  let wallet: WarpSuiWallet
  let mockKeypair: any
  let mockClient: any

  beforeEach(() => {
    // Mock the keypair
    mockKeypair = {
      signTransaction: jest.fn().mockResolvedValue('mock-signed-tx'),
      signPersonalMessage: jest.fn().mockResolvedValue({
        signature: 'mock-signature',
      }),
    }

    // Mock the client
    mockClient = {
      signAndExecuteTransaction: jest.fn().mockResolvedValue({
        digest: 'mock-digest',
      }),
    }

    wallet = new WarpSuiWallet(mockKeypair, mockClient)
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBe('mock-signature')
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
      expect(signedTx.signature).toBe('mock-signed-tx')
      expect(mockKeypair.signTransaction).toHaveBeenCalledWith(tx)
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
      }

      const digest = await wallet.sendTransaction(tx)
      expect(digest).toBe('mock-digest')
      expect(mockClient.signAndExecuteTransaction).toHaveBeenCalledWith({
        transaction: tx,
        signer: mockKeypair,
      })
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })
})
