import { createMockAdapter, createMockChainInfo, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig, WarpCollectAction } from './types'
import { WarpExecutor } from './WarpExecutor'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('WarpExecutor', () => {
  const handlers = { onExecuted: jest.fn(), onError: jest.fn() }
  const warp: Warp = createMockWarp()

  const mockChainInfo = createMockChainInfo('multiversx')

  const config: WarpClientConfig = {
    env: 'devnet',
    user: { wallets: { MULTIVERSX: 'erd1...' } },
    clientUrl: 'https://anyclient.com',
    currentUrl: 'https://anyclient.com',
  }
  const adapters = [
    (() => {
      const a = createMockAdapter()
      a.chain = 'multiversx'
      a.prefix = 'mvx'
      return a
    })(),
    (() => {
      const a = createMockAdapter()
      a.chain = 'sui'
      a.prefix = 'sui'
      return a
    })(),
  ]
  const executor = new WarpExecutor(config, adapters, handlers)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('executes a warp with multiple actions', async () => {
      const result = await executor.execute(warp, [])
      expect(result).toBeDefined()
      // onExecuted is only called for collect actions or after evaluateResults
      // For regular actions, it's not called during execute
    })

    it('handles execution errors gracefully', async () => {
      const errorWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Error Action',
            chain: 'invalid-chain',
            address: 'invalid-address',
            value: '0',
            inputs: [],
          },
        ],
      }
      await expect(executor.execute(errorWarp, [])).rejects.toThrow('WarpUtils: Chain info not found for invalid-chain')
    })
  })

  describe('collect actions', () => {
    it('handles collect actions correctly', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
              {
                name: 'amount',
                type: 'biguint',
                source: 'field' as const,
                position: 'value' as const,
              },
              {
                name: 'token',
                type: 'string',
                source: 'field' as const,
                position: 'transfer' as const,
              },
              {
                name: 'queryParam',
                type: 'string',
                source: 'query' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }
      // Provide valid receiver input for the collect action
      const inputs = ['address:erd1receiver', 'biguint:100', 'token:MYTOKEN', 'queryParam:foo']
      const result = await executor.execute(collectWarp, inputs)
      expect(result).toBeDefined()
      expect(handlers.onExecuted).toHaveBeenCalled()
    })
  })
})
