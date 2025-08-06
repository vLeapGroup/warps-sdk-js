import { WarpClientConfig } from '@vleap/warps'
import { WarpEvmResults } from './WarpEvmResults'

describe('WarpEvmResults', () => {
  let results: WarpEvmResults
  let mockConfig: WarpClientConfig

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
    } as WarpClientConfig

    results = new WarpEvmResults(mockConfig)
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

      const result = await results.getTransactionExecutionResults(warp, mockReceipt)

      expect(result.success).toBe(true)
      expect(result.warp).toBe(warp)
      expect(result.action).toBe(0)
      expect(result.user).toBe(mockConfig.user?.wallets?.evm)
      expect(result.txHash).toBe('0x1234567890abcdef')
      expect(result.next).toBe(null)
      expect(result.values).toContain('0x1234567890abcdef')
      expect(result.values).toContain('12345')
      expect(result.values).toContain('21000')
      expect(result.values).toContain('20000000000')
      expect(result.results).toEqual({})
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

      const result = await results.getTransactionExecutionResults(warp, mockReceipt)

      expect(result.success).toBe(false)
      expect(result.values).toContain('0x1234567890abcdef')
      expect(result.values).toContain('12345')
      expect(result.values).toContain('21000')
      expect(result.values).toContain('20000000000')
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

      const result = await results.getTransactionExecutionResults(warp, mockReceipt)

      expect(result.success).toBe(true)
      expect(result.values).toContain('0x1234567890abcdef')
      expect(result.values).toContain('0')
      expect(result.values).toContain('0')
      expect(result.values).toContain('0')
    })
  })
})
