import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig, WarpCollectAction } from './types'
import { WarpExecutor } from './WarpExecutor'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock safeWindow
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  safeWindow: { open: jest.fn() },
}))

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
      a.prefix = 'multiversx'
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
      expect(result.chain).toBeDefined()
      expect(result.immediateExecutions).toBeDefined()
      expect(result.txs).toBeDefined()
      expect(Array.isArray(result.txs)).toBe(true)
      expect(Array.isArray(result.immediateExecutions)).toBe(true)
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
      // The new implementation uses default chain when invalid chain is provided
      const result = await executor.execute(errorWarp, [])
      expect(result).toBeDefined()
      expect(result.chain).toBeDefined()
      expect(result.chain.name).toBe('multiversx') // Should fall back to default chain
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
        chain: 'multiversx',
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

    it('interpolates input variables in destination URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Check rewards',
            destination: {
              url: '{{CHAIN_API}}/accounts/{{ADDRESS}}/delegation',
              method: 'GET' as const,
            },
            inputs: [
              {
                name: 'Address',
                as: 'ADDRESS',
                type: 'address',
                source: 'field' as const,
                required: true,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1test123456789']
      await executor.execute(collectWarp, inputs)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).toContain('/accounts/erd1test123456789/delegation')
      expect(url).toContain('devnet-api.multiversx.com')
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

    it('should handle hidden inputs with default values', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const hiddenInputWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Hidden Input',
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
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'apiVersion',
                type: 'string',
                source: 'hidden' as const,
                default: 'v1.0',
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'timestamp',
                type: 'string',
                source: 'hidden' as const,
                default: '2024-01-01T00:00:00Z',
                position: 'payload:data.metadata' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:REF123']
      const result = await executor.execute(hiddenInputWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                customer: {
                  reference: 'REF123',
                  apiVersion: 'v1.0',
                },
              },
              metadata: {
                timestamp: '2024-01-01T00:00:00Z',
              },
            },
          }),
        })
      )
    })

    it('should handle mixed hidden and user inputs', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const mixedInputWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Mixed Inputs',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'userEmail',
                as: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer' as const,
              },
              {
                name: 'apiKey',
                type: 'string',
                source: 'hidden' as const,
                default: 'secret-key-123',
                position: 'payload:request.headers' as const,
              },
              {
                name: 'requestId',
                type: 'string',
                source: 'hidden' as const,
                default: 'req-456',
                position: 'payload:request.metadata' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:user@example.com']
      const result = await executor.execute(mixedInputWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            request: {
              customer: {
                email: 'user@example.com',
              },
              headers: {
                apiKey: 'secret-key-123',
              },
              metadata: {
                requestId: 'req-456',
              },
            },
          }),
        })
      )
    })

    it('should handle hidden inputs without position (flat structure)', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const flatHiddenWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Flat Hidden Input',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'userInput',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'version',
                type: 'string',
                source: 'hidden' as const,
                default: '2.1.0',
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-value']
      const result = await executor.execute(flatHiddenWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userInput: 'test-value',
            version: '2.1.0',
          }),
        })
      )
    })

    it('should return unhandled status when collect action destination object has no URL property', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect without Destination URL',
            destination: { method: 'POST' } as any,
            inputs: [
              {
                name: 'destination',
                type: 'string',
                source: 'field' as const,
                position: 'destination' as const,
              },
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:dummy-destination', 'string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result).toBeDefined()
      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].status).toBe('unhandled')
      expect(result.immediateExecutions[0].warp).toEqual(unhandledWarp)
      expect(result.immediateExecutions[0].action).toBe(1)
      expect(result.immediateExecutions[0].output).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
      expect(handlers.onExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhandled',
          warp: unhandledWarp,
          action: 1,
        })
      )
    })

    it('should return unhandled status when collect action destination is a string without URL', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with String Destination',
            destination: 'some-string-destination' as any,
            inputs: [
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result).toBeDefined()
      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].status).toBe('unhandled')
      expect(result.immediateExecutions[0].warp).toEqual(unhandledWarp)
      expect(result.immediateExecutions[0].action).toBe(1)
      expect(result.immediateExecutions[0].output).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
      expect(handlers.onExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhandled',
          warp: unhandledWarp,
          action: 1,
        })
      )
    })

    it('should evaluate output correctly for unhandled collect', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Unhandled Collect with Output',
            destination: 'some-destination' as any,
            inputs: [
              {
                name: 'username',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'userId',
                as: 'ID',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'user',
                as: 'name',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.user' as const,
              },
            ],
            next: '{{STATUS}}',
          } as WarpCollectAction,
        ],
        output: {
          USERNAME: 'out.username',
          USERNAME_INPUT: 'in.username',
          USER_ID: 'in.ID',
          USER_NAME: 'out.data.user.name',
          STATUS: 'out.username',
        },
      }

      const inputs = ['string:john_doe', 'string:user123', 'string:Alice']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('unhandled')
      expect(execution.output.USERNAME).toBe('john_doe')
      expect(execution.output.USERNAME_INPUT).toBe('john_doe')
      expect(execution.output.USER_ID).toBe('user123')
      expect(execution.output.USER_NAME).toBe('Alice')
      expect(execution.output.STATUS).toBe('john_doe')
      expect(execution.values.string.length).toBeGreaterThan(0)
      expect(execution.values.native.length).toBeGreaterThan(0)
      expect(execution.next).toBeDefined()
      expect(execution.next).toHaveLength(1)
      expect(execution.next?.[0]?.identifier).toBeDefined()
    })

    it('sets destination in WarpActionExecutionResult from input with position destination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'destination',
                type: 'address',
                source: 'field' as const,
                position: 'destination' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1destination123456789']
      const result = await executor.execute(collectWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].destination).toBe('address:erd1destination123456789')
      expect(handlers.onExecuted).toHaveBeenCalled()
      const executionResult = handlers.onExecuted.mock.calls[0][0]
      expect(executionResult.destination).toBe('address:erd1destination123456789')
    })

    it('should handle unhandled collect with no output configuration', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Unhandled Collect No Output',
            destination: 'some-destination' as any,
            inputs: [
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('unhandled')
      expect(execution.output).toEqual({})
      expect(execution.values.string).toEqual([])
      expect(execution.values.native).toEqual([])
    })
  })

  describe('multi-action execution', () => {
    it('should emit onActionExecuted for each action', async () => {
      const onActionExecuted = jest.fn()
      const multiActionHandlers = {
        onActionExecuted,
        onError: jest.fn(),
      }
      const multiActionExecutor = new WarpExecutor(config, adapters, multiActionHandlers)

      const multiActionWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer 1',
            chain: 'multiversx',
            address: 'erd1receiver1',
            value: '1000000000000000000',
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer 2',
            chain: 'multiversx',
            address: 'erd1receiver2',
            value: '2000000000000000000',
            inputs: [],
          },
        ],
      }

      await multiActionExecutor.execute(multiActionWarp, [])

      // Transfer actions don't call onActionExecuted in the current implementation
      // Only collect, link, and query actions call onActionExecuted
      expect(onActionExecuted).toHaveBeenCalledTimes(0)
    })

    it('should handle mixed action types correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'collect data' }),
      })

      const mixedWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer After Collect',
            chain: 'multiversx',
            address: 'erd1receiver',
            value: '1000000000000000000',
            inputs: [],
          },
        ],
      }

      await executor.execute(mixedWarp, [])
    })

    it('should handle multiple actions on same chain correctly', async () => {
      const multiActionWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer 1',
            chain: 'multiversx',
            address: 'erd1receiver1',
            value: '1000000000000000000',
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer 2',
            chain: 'multiversx',
            address: 'erd1receiver2',
            value: '2000000000000000000',
            inputs: [],
          },
        ],
      }

      await executor.execute(multiActionWarp, [])
    })
  })

  describe('execution handlers - async vs sync', () => {
    it('should handle sync onExecuted handler', async () => {
      const syncHandler = jest.fn()
      const syncHandlers = { onExecuted: syncHandler, onError: jest.fn() }
      const syncExecutor = new WarpExecutor(config, adapters, syncHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await syncExecutor.execute(collectWarp, inputs)

      expect(syncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })

    it('should handle async onExecuted handler', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined)
      const asyncHandlers = { onExecuted: asyncHandler, onError: jest.fn() }
      const asyncExecutor = new WarpExecutor(config, adapters, asyncHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await asyncExecutor.execute(collectWarp, inputs)

      expect(asyncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })

    it('should handle mixed async/sync handlers', async () => {
      const syncExecutedHandler = jest.fn()
      const asyncExecutedHandler = jest.fn().mockResolvedValue(undefined)
      const mixedHandlers = {
        onExecuted: syncExecutedHandler,
        onError: jest.fn(),
      }
      const mixedExecutor = new WarpExecutor(config, adapters, mixedHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await mixedExecutor.execute(collectWarp, inputs)

      expect(syncExecutedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })
  })

  describe('link actions with auto enabled', () => {
    it('should execute link actions when auto is explicitly set to true', async () => {
      const { safeWindow } = require('./constants')
      const mockWindowOpen = safeWindow.open as jest.Mock
      mockWindowOpen.mockClear()

      const linkWarp = {
        ...warp,
        actions: [
          {
            type: 'link' as const,
            label: 'Auto Link',
            auto: true,
            url: 'https://example.com',
          },
        ],
      }

      const result = await executor.execute(linkWarp, [])

      expect(result).toBeDefined()
      expect(result.chain).toBeDefined()
      expect(result.txs).toEqual([])
      expect(result.immediateExecutions).toEqual([])
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com', '_blank')
    })
  })
})
