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
      blockTime: 12,
      addressHrp: 'fs',
      apiUrl: 'https://api.fastset.xyz',
      explorerUrl: 'https://explorer.fastset.xyz',
      nativeToken: 'FS',
    }
    executor = new WarpFastsetExecutor(mockConfig, 'fastset')
    ;(fetch as jest.Mock).mockClear()
  })

  describe('preprocessInput', () => {
    it('should preprocess address input', async () => {
      const result = await executor.preprocessInput(mockChainInfo, 'input', 'address', 'fs1testaddress123456789')
      expect(result).toBe('fs1testaddress123456789')
    })

    it('should preprocess number input', async () => {
      const result = await executor.preprocessInput(mockChainInfo, 'input', 'number', '123')
      expect(result).toBe('123')
    })

    it('should preprocess bigint input', async () => {
      const result = await executor.preprocessInput(mockChainInfo, 'input', 'bigint', '1000000000000000000')
      expect(result).toBe('1000000000000000000')
    })

    it('should handle string input', async () => {
      const result = await executor.preprocessInput(mockChainInfo, 'input', 'string', 'hello')
      expect(result).toBe('hello')
    })

    it('should throw error for invalid number', async () => {
      await expect(executor.preprocessInput(mockChainInfo, 'input', 'number', 'invalid')).rejects.toThrow('Invalid number format')
    })

    it('should throw error for negative bigint', async () => {
      await expect(executor.preprocessInput(mockChainInfo, 'input', 'bigint', '-100')).rejects.toThrow(
        'Negative value not allowed for type bigint'
      )
    })
  })

  describe('createTransferTransaction', () => {
    it('should create transfer transaction', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'fs1destination123456789',
        value: BigInt(1000000),
        data: 'string:hello',
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer' as const,
              label: 'Send FS',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransferTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-transfer',
        from: 'fs1testaddress123456789',
        to: 'fs1destination123456789',
        value: BigInt(1000000),
        data: 'hello',
      })
    })

    it('should throw error when user wallet not set', async () => {
      const executorWithoutWallet = new WarpFastsetExecutor({ env: 'testnet', user: { wallets: {} } }, 'fastset')

      const executable = {
        chain: mockChainInfo,
        destination: 'fs1destination123456789',
        value: BigInt(1000000),
        data: null,
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer' as const,
              label: 'Send FS',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executorWithoutWallet.createTransferTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: createTransfer - user address not set'
      )
    })

    it('should throw error for negative value', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'fs1destination123456789',
        value: BigInt(-1000000),
        data: null,
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer' as const,
              label: 'Send FS',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('WarpFastsetExecutor: Transfer value cannot be negative')
    })
  })

  describe('createContractCallTransaction', () => {
    it('should create contract call transaction', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'fs1contract123456789',
        value: BigInt(0),
        data: null,
        args: ['fs1destination123456789', '1000000'], // Changed BigInt to string
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'contract' as const,
              label: 'Transfer',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createContractCallTransaction(executable)

      expect(tx).toEqual({
        type: 'fastset-contract-call',
        from: 'fs1testaddress123456789',
        to: 'fs1contract123456789',
        value: BigInt(0),
        data: '{"function":"transfer(address,uint256)","arguments":["fs1destination123456789","1000000"]}',
        function: 'transfer(address,uint256)',
      })
    })

    it('should throw error when user wallet not set', async () => {
      const executorWithoutWallet = new WarpFastsetExecutor({ env: 'testnet', user: { wallets: {} } }, 'fastset')

      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        value: BigInt(0),
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'contract' as const,
              label: 'Transfer',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executorWithoutWallet.createContractCallTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: createContractCall - user address not set'
      )
    })

    it('should throw error for negative value', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        value: BigInt(-1000000),
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'contract' as const,
              label: 'Transfer',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: Contract call value cannot be negative'
      )
    })
  })

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const mockResponse = { result: 'success' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'query' as const,
              label: 'Balance Check',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        value: BigInt(0),
        transfers: [],
        resolvedInputs: [],
      }

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: true,
        result: mockResponse,
      })
    })

    it('should handle query failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'query' as const,
              label: 'Balance Check',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        value: BigInt(0),
        transfers: [],
        resolvedInputs: [],
      }

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: false,
        error: 'Fastset query failed: Not Found',
      })
    })

    it('should throw error for invalid action type', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        value: BigInt(0),
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpFastsetExecutor: Invalid action type for executeQuery')
    })
  })

  describe('createTransaction', () => {
    it('should create transfer transaction', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1destination123456789',
        value: BigInt(1000000),
        data: null,
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer' as const,
              label: 'Send PI',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransaction(executable)

      expect(tx.type).toBe('fastset-transfer')
    })

    it('should create contract call transaction', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        value: BigInt(0),
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'contract' as const,
              label: 'Transfer',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransaction(executable)

      expect(tx.type).toBe('fastset-contract-call')
    })

    it('should throw error for query action type', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'query' as const,
              label: 'Balance Check',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        value: BigInt(0),
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead'
      )
    })

    it('should throw error for collect action type', async () => {
      const executable = {
        chain: mockChainInfo,
        destination: 'pi1contract123456789',
        data: null,
        args: [],
        warp: {
          protocol: 'warp',
          name: 'test-warp',
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'collect' as const,
              label: 'Collect Data',
              destination: {
                url: 'https://example.com',
              },
            },
          ],
        },
        action: 1,
        value: BigInt(0),
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createTransaction(executable)).rejects.toThrow(
        'WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead'
      )
    })
  })
})
