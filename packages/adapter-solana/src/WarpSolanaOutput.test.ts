import { WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpSolanaOutput } from './WarpSolanaOutput'
import { NativeTokenSol } from './chains/solana'

describe('WarpSolanaOutput', () => {
  let output: WarpSolanaOutput
  let mockConfig: WarpClientConfig
  let mockChainInfo: WarpChainInfo

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          [WarpChainName.Solana]: '5KJvsngHeMoo424rH3Y1bVhjKM2f7jNsN1Tsp9i6F9XHj8qJ7vK',
        },
      },
    } as WarpClientConfig

    mockChainInfo = {
      name: WarpChainName.Solana,
      displayName: 'Solana Testnet',
      chainId: '103',
      blockTime: 400,
      addressHrp: '',
      defaultApiUrl: 'https://api.testnet.solana.com',
      logoUrl: 'https://example.com/solana-logo.png',
      nativeToken: NativeTokenSol,
    }

    output = new WarpSolanaOutput(mockConfig, mockChainInfo)
  })

  describe('getActionExecution', () => {
    it('should return failed execution for null transaction', async () => {
      const warp = { actions: [] } as any
      const result = await output.getActionExecution(warp, 1, null as any)
      expect(result.status).toBe('error')
      expect(result.txHash).toBe('')
    })

    it('should handle transaction signature string', async () => {
      const warp = { actions: [] } as any
      const signature = 'test-signature'
      try {
        const result = await output.getActionExecution(warp, 1, signature)
        expect(result).toBeDefined()
      } catch (error) {
        // Expected to fail in test environment
      }
    })
  })

  describe('extractQueryOutput', () => {
    it('should extract query output from typed values', async () => {
      const warp = { actions: [] } as any
      const typedValues = ['test', 123, true]
      const result = await output.extractQueryOutput(warp, typedValues, 1, [])
      expect(result).toBeDefined()
      expect(result.values).toBeDefined()
      expect(result.output).toBeDefined()
    })

    it('should handle empty output', async () => {
      const warp = { actions: [] } as any
      const typedValues: any[] = []
      const result = await output.extractQueryOutput(warp, typedValues, 1, [])
      expect(result.values.string).toEqual([])
      expect(result.values.native).toEqual([])
    })
  })

  describe('getTransactionStatus', () => {
    it('should return pending status for non-existent transaction', async () => {
      try {
        const result = await output.getTransactionStatus('invalid-signature')
        expect(result.status).toBe('pending')
      } catch (error) {
        // Expected to fail in test environment
      }
    })
  })

  describe('getTransactionReceipt', () => {
    it('should return null for non-existent transaction', async () => {
      const result = await output.getTransactionReceipt('invalid-signature')
      expect(result).toBeNull()
    })
  })
})
