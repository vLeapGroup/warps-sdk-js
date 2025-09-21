import { WarpFastsetExecutor } from './WarpFastsetExecutor'
;(global.fetch as jest.Mock).mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ result: 123 }),
})

// Mock bech32 decoding to avoid network calls and validation errors
jest.mock('bech32', () => ({
  bech32: {
    decode: jest.fn((address) => {
      if (address.includes('invalid')) {
        throw new Error('Invalid checksum for ' + address)
      }
      return { prefix: 'fs', words: [1, 2, 3, 4, 5] }
    }),
    fromWords: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
  },
  bech32m: {
    decode: jest.fn((address) => {
      if (address.includes('invalid')) {
        throw new Error('Invalid checksum for ' + address)
      }
      return { prefix: 'fs', words: [1, 2, 3, 4, 5] }
    }),
    fromWords: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
  },
}))

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
      defaultApiUrl: 'https://api.fastset.xyz',
      explorerUrl: 'https://explorer.fastset.xyz',
      nativeToken: 'FS',
    }
    executor = new WarpFastsetExecutor(mockConfig, mockChainInfo)
    ;(fetch as jest.Mock).mockClear()
  })

  describe('createTransferTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(1000000000000000000),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      expect(tx).toBeInstanceOf(Object)
      expect(tx).toHaveProperty('claim')
      expect(tx).toHaveProperty('nonce')
      expect(tx).toHaveProperty('recipient')
      expect(tx).toHaveProperty('sender')
      expect(tx).toHaveProperty('timestamp_nanos')
    })

    it('should throw error for invalid destination address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(1000000000000000000),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('Invalid checksum for invalid-address')
    })

    it('should throw error for negative values', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(-1000000000000000000),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: No valid transfers provided (maximum 1 transfer allowed)')
    })

    it('should throw error when user wallet is not set', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(1000000000000000000),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      const executorWithoutWallet = new WarpFastsetExecutor(
        {
          env: 'testnet',
          user: {
            wallets: {},
          },
        },
        mockChainInfo
      )

      await expect(executorWithoutWallet.createTransferTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: createTransfer - user address not set'
      )
    })
  })

  describe('createContractCallTransaction', () => {
    it('should throw not implemented for contract call transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer',
            },
          ],
        },
        action: 1,
        args: ['fs1recipient123456789', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw error for invalid contract address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer',
            },
          ],
        },
        action: 1,
        args: ['fs1recipient123456789', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw error when contract action has no function', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'contract',
            },
          ],
        },
        action: 1,
        args: ['fs1recipient123456789', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })
  })

  describe('executeQuery', () => {
    it('should throw not implemented for execute query', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf',
            },
          ],
        },
        action: 1,
        args: ['fs1testaddress123456789'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw not implemented for query failure', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf',
            },
          ],
        },
        action: 1,
        args: ['fs1testaddress123456789'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw error for invalid action type', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw error when query action has no function', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'query',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })
  })

  describe('createTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(1000000000000000000),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
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

      expect(tx).toBeInstanceOf(Object)
      expect(tx).toHaveProperty('claim')
      expect(tx).toHaveProperty('nonce')
      expect(tx).toHaveProperty('recipient')
      expect(tx).toHaveProperty('sender')
      expect(tx).toHaveProperty('timestamp_nanos')
    })

    it('should throw not implemented for contract call transaction', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer',
            },
          ],
        },
        action: 1,
        args: ['fs1recipient123456789', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Not implemented')
    })

    it('should throw error for query action type', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead'
      )
    })

    it('should throw error for collect action type', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'collect',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead'
      )
    })

    it('should throw error for unknown action type', async () => {
      const executable = {
        destination: 'fs1testaddress123456789',
        value: BigInt(0),
        data: null,
        chain: {
          name: 'fastset',
          displayName: 'Fastset',
          chainId: '1',
          blockTime: 12000,
          addressHrp: 'fs',
          defaultApiUrl: 'https://api.fastset.xyz',
          nativeToken: 'FS',
        },
        warp: {
          actions: [
            {
              type: 'unknown',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Invalid action type (unknown)')
    })
  })
})
