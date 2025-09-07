import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig, WarpCollectAction } from './types'
import { WarpExecutor } from './WarpExecutor'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('WarpExecutor', () => {
  const handlers = { onExecuted: jest.fn(), onError: jest.fn() }
  const warp: Warp = createMockWarp()

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
      await expect(executor.execute(errorWarp, [])).rejects.toThrow('Adapter not found for chain: invalid-chain')
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
                name: 'asset',
                type: 'asset',
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
      const inputs = ['address:erd1receiver', 'biguint:100', 'asset:MYTOKEN|100', 'queryParam:foo']
      const result = await executor.execute(collectWarp, inputs)
      expect(result).toBeDefined()
      expect(handlers.onExecuted).toHaveBeenCalled()
    })

    it('handles nested payload structure with position parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const nestedPayloadWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Nested Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'reference',
                as: 'ref',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'country',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'amount',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:123', 'string:micha@vleap.ai', 'string:AT', 'string:10.00']
      const result = await executor.execute(nestedPayloadWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                customer: {
                  ref: '123',
                  email: 'micha@vleap.ai',
                  country: 'AT',
                  amount: '10.00',
                },
              },
            },
          }),
        })
      )
    })

    it('maintains flat payload structure when position is not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const flatPayloadWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Flat Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'reference',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:123', 'string:micha@vleap.ai']
      const result = await executor.execute(flatPayloadWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            reference: '123',
            email: 'micha@vleap.ai',
          }),
        })
      )
    })

    it('builds nested payload correctly with multiple levels', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const multiLevelWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Multi Level Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'user',
                as: 'name',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer.info' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer.info' as const,
              },
              {
                name: 'amount',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.transaction' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:John Doe', 'string:john@example.com', 'string:100.00']
      const result = await executor.execute(multiLevelWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            request: {
              customer: {
                info: {
                  name: 'John Doe',
                  email: 'john@example.com',
                },
              },
              transaction: {
                amount: '100.00',
              },
            },
          }),
        })
      )
    })
  })
})
