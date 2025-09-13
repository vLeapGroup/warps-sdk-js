import { WarpEvmWallet } from './WarpEvmWallet'

describe('WarpEvmWallet', () => {
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
  const rpcUrl = 'https://rpc.sepolia.org'
  let wallet: WarpEvmWallet

  beforeEach(() => {
    wallet = new WarpEvmWallet(privateKey, rpcUrl)
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
})
