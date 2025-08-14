import { WarpFastsetExecutor } from './WarpFastsetExecutor'

// Mock fetch globally
global.fetch = jest.fn()

describe('WarpFastsetExecutor', () => {
  let executor: WarpFastsetExecutor
  let mockConfig: any
  let mockChainInfo: any

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          fastset: 'fs1testaddress123456789',
        },
      },
    }
    mockChainInfo = {
      name: 'fastset',
      displayName: 'Fastset',
      chainId: '1',
      blockTime: 12000,
      addressHrp: 'fs',
      apiUrl: 'https://api.fastset.xyz',
      explorerUrl: 'https://explorer.fastset.xyz',
      nativeToken: 'FS',
    }
    executor = new WarpFastsetExecutor(mockConfig)
    ;(fetch as jest.Mock).mockClear()
  })

  describe('preprocessInput', () => {
    it('should validate and format addresses', async () => {
      const address = 'fs1testaddress123456789'
      const result = await executor.preprocessInput({} as any, 'address', 'address', address)
      expect(result).toBe(address)
    })

    it('should validate and format hex strings', async () => {
      const hex = '0x1234567890abcdef'
      const result = await executor.preprocessInput({} as any, 'hex', 'hex', hex)
      expect(result).toBe(hex)
    })

    it('should validate and format bigint values', async () => {
      const result = await executor.preprocessInput({} as any, 'biguint', 'biguint', '123456789')
      expect(result).toBe('123456789')
    })

    it('should throw error for invalid addresses', async () => {
      await expect(executor.preprocessInput({} as any, 'address', 'address', 'invalid-address')).rejects.toThrow('Invalid Fastset address format: invalid-address')
    })

    it('should throw error for invalid hex strings', async () => {
      await expect(executor.preprocessInput({} as any, 'hex', 'hex', 'invalid-hex')).rejects.toThrow('Invalid hex format')
    })

    it('should throw error for negative bigint values', async () => {
      await expect(executor.preprocessInput({} as any, 'biguint', 'biguint', '-123')).rejects.toThrow('Negative value not allowed')
    })
  })

  describe('createTransferTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(1000000000000000000),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createTransferTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-transfer',
        recipient: expect.any(Uint8Array),
        amount: 'de0b6b3a7640000',
        userData: undefined,
        chain: 'fastset',
      })
    })

    it('should throw error for invalid destination address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(1000000000000000000),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Invalid destination address')
    })
  })

  describe('createContractCallTransaction', () => {
    it('should create contract call transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'testFunction',
            },
          ],
        },
        action: 1,
        args: ['string:hello', 'number:42'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createContractCallTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-contract-call',
        contract: expect.any(Uint8Array),
        function: 'testFunction',
        data: expect.any(String),
        value: BigInt(0),
        chain: 'fastset',
      })
    })

    it('should throw error for invalid contract address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'testFunction',
            },
          ],
        },
        action: 1,
        args: ['string:hello', 'number:42'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Invalid contract address')
    })
  })

  describe('executeQuery', () => {
    it('should execute a query successfully', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: ['fs1testaddress123456789'],
        transfers: [],
        resolvedInputs: [],
      } as any

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'success', data: '1000000000000000000' }),
      })

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: true,
        result: {
          result: 'success',
          data: '1000000000000000000',
        },
        chain: 'fastset',
      })
    })

    it('should handle query failure', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: ['fs1testaddress123456789'],
        transfers: [],
        resolvedInputs: [],
      } as any

      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Not Found'))

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: false,
        error: 'Fastset query failed: Not Found',
        chain: 'fastset',
      })
    })
  })

  describe('createTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(1000000000000000000),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-transfer',
        recipient: expect.any(Uint8Array),
        amount: 'de0b6b3a7640000',
        userData: undefined,
        chain: 'fastset',
      })
    })

    it('should create contract call transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'testFunction',
            },
          ],
        },
        action: 1,
        args: ['string:hello', 'number:42'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-contract-call',
        contract: expect.any(Uint8Array),
        function: 'testFunction',
        data: expect.any(String),
        value: BigInt(0),
        chain: 'fastset',
      })
    })

    it('should throw error for unsupported action type', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: 'fastset',
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    })
  })

  describe('signMessage', () => {
    it('should sign a message', async () => {
      const message = 'test message'
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      await expect(executor.signMessage(message, privateKey)).rejects.toThrow('Not implemented')
    })
  })
})
