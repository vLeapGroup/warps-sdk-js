import { WarpClientConfig } from '@vleap/warps'
import { WarpEvmOutput } from './WarpEvmOutput'

describe('WarpEvmOutput', () => {
  let output: WarpEvmOutput
  let mockConfig: WarpClientConfig

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
    } as WarpClientConfig

    output = new WarpEvmOutput(mockConfig, {
      name: 'ethereum',
      chainId: '1',
      defaultApiUrl: 'https://eth.llamarpc.com',
      nativeToken: { identifier: 'ETH', decimals: 18 },
    } as any)
  })

  describe('getTransactionExecutionResults', () => {
    it('should return successful execution results', async () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      } as any

      const mockReceipt = {
        status: 1,
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        blockNumber: 12345,
        hash: '0x1234567890abcdef',
        logs: [
          {
            address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            topics: ['0x1234567890abcdef'],
            data: '0x',
            blockNumber: 12345,
            transactionHash: '0x1234567890abcdef',
            index: 0,
          },
        ],
      } as any

      const result = await output.getActionExecution(warp, 1, mockReceipt)

      expect(result.status).toBe('success')
      expect(result.warp).toBe(warp)
      expect(result.action).toBe(1)
      expect(result.user).toBe(mockConfig.user?.wallets?.ethereum)
      expect(result.txHash).toBe('0x1234567890abcdef')
      expect(result.next).toBe(null)
      expect(result.values.string).toEqual(expect.arrayContaining(['0x1234567890abcdef', '12345', '21000', '20000000000']))
      expect(result.values.native).toEqual(expect.arrayContaining(['0x1234567890abcdef', '12345', '21000', '20000000000']))
      expect(result.output).toEqual({})
      expect(result.messages).toEqual({})
    })

    it('should return failed execution results', async () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      } as any

      const mockReceipt = {
        status: 0,
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        blockNumber: 12345,
        hash: '0x1234567890abcdef',
        logs: [],
      } as any

      const result = await output.getActionExecution(warp, 1, mockReceipt)

      expect(result.status).toBe('error')
      expect(result.values.string).toEqual(expect.arrayContaining(['0x1234567890abcdef', '12345', '21000', '20000000000']))
      expect(result.values.native).toEqual(expect.arrayContaining(['0x1234567890abcdef', '12345', '21000', '20000000000']))
    })

    it('should handle missing optional fields', async () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      } as any

      const mockReceipt = {
        status: 1,
        hash: '0x1234567890abcdef',
        logs: [],
      } as any

      const result = await output.getActionExecution(warp, 1, mockReceipt)

      expect(result.status).toBe('success')
      expect(result.values.string).toEqual(expect.arrayContaining(['0x1234567890abcdef', '0', '0', '0']))
      expect(result.values.native).toEqual(expect.arrayContaining(['0x1234567890abcdef', '0', '0', '0']))
    })

    it('should handle null transaction gracefully', async () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      } as any

      const result = await output.getActionExecution(warp, 1, null)

      expect(result.status).toBe('error')
      expect(result.warp).toBe(warp)
      expect(result.action).toBe(1)
      expect(result.user).toBe(mockConfig.user?.wallets?.ethereum)
      expect(result.txHash).toBe('')
      expect(result.tx).toBe(null)
      expect(result.next).toBe(null)
      expect(result.values.string).toEqual([])
      expect(result.values.native).toEqual([])
      expect(result.output).toEqual({})
      expect(result.messages).toEqual({})
    })
  })
})
