import { createMockAdapter, createMockChainInfo, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig, WarpCollectAction } from './types'
import { WarpExecutor } from './WarpExecutor'

describe('WarpExecutor', () => {
  const handlers = { onExecuted: jest.fn() }
  const warp: Warp = createMockWarp()

  const mockChainInfo = createMockChainInfo('multiversx')

  const config: WarpClientConfig = {
    env: 'devnet',
    user: { wallet: 'erd1...' },
    clientUrl: 'https://anyclient.com',
    currentUrl: 'https://anyclient.com',
    repository: {
      ...createMockAdapter(),
      registry: {
        ...createMockAdapter().registry,
        getChainInfo: jest.fn().mockResolvedValue(mockChainInfo),
      },
    },
    adapters: [
      {
        chain: 'multiversx',
        builder: {
          createInscriptionTransaction: jest.fn(),
          createFromTransaction: jest.fn(),
          createFromTransactionHash: jest.fn(),
        },
        executor: {
          async createTransaction() {
            return 'multiversx-result'
          },
          async preprocessInput() {
            return ''
          },
        },
        results: {
          getTransactionExecutionResults: jest.fn(),
        },
        serializer: {
          typedToString: jest.fn(),
          typedToNative: jest.fn(),
          nativeToTyped: jest.fn(),
          nativeToType: jest.fn(),
          stringToTyped: jest.fn(),
        },
        registry: {
          createWarpRegisterTransaction: jest.fn(),
          createWarpUnregisterTransaction: jest.fn(),
          createWarpUpgradeTransaction: jest.fn(),
          createWarpAliasSetTransaction: jest.fn(),
          createWarpVerifyTransaction: jest.fn(),
          createWarpTransferOwnershipTransaction: jest.fn(),
          createBrandRegisterTransaction: jest.fn(),
          createWarpBrandingTransaction: jest.fn(),
          getInfoByAlias: jest.fn(),
          getInfoByHash: jest.fn(),
          getUserWarpRegistryInfos: jest.fn(),
          getUserBrands: jest.fn(),
          getChainInfos: jest.fn(),
          getChainInfo: jest.fn().mockResolvedValue(mockChainInfo),
          setChain: jest.fn(),
          removeChain: jest.fn(),
          fetchBrand: jest.fn(),
        },
      },
      {
        chain: 'sui',
        builder: {
          createInscriptionTransaction: jest.fn(),
          createFromTransaction: jest.fn(),
          createFromTransactionHash: jest.fn(),
        },
        executor: {
          async createTransaction() {
            return 'sui-result'
          },
          async preprocessInput() {
            return ''
          },
        },
        results: {
          getTransactionExecutionResults: jest.fn(),
        },
        serializer: {
          typedToString: jest.fn(),
          typedToNative: jest.fn(),
          nativeToTyped: jest.fn(),
          nativeToType: jest.fn(),
          stringToTyped: jest.fn(),
        },
        registry: {
          createWarpRegisterTransaction: jest.fn(),
          createWarpUnregisterTransaction: jest.fn(),
          createWarpUpgradeTransaction: jest.fn(),
          createWarpAliasSetTransaction: jest.fn(),
          createWarpVerifyTransaction: jest.fn(),
          createWarpTransferOwnershipTransaction: jest.fn(),
          createBrandRegisterTransaction: jest.fn(),
          createWarpBrandingTransaction: jest.fn(),
          getInfoByAlias: jest.fn(),
          getInfoByHash: jest.fn(),
          getUserWarpRegistryInfos: jest.fn(),
          getUserBrands: jest.fn(),
          getChainInfos: jest.fn(),
          getChainInfo: jest.fn(),
          setChain: jest.fn(),
          removeChain: jest.fn(),
          fetchBrand: jest.fn(),
        },
      },
    ],
  }

  const executor = new WarpExecutor(config, handlers)

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
      const result = await executor.execute(errorWarp, [])
      expect(result).toBeDefined()
    })
  })

  describe('collect actions', () => {
    it('handles collect actions correctly', async () => {
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
                type: 'string',
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
      const inputs = ['address:erd1receiver', 'amount:100', 'token:MYTOKEN', 'queryParam:foo']
      const result = await executor.execute(collectWarp, inputs)
      expect(result).toBeDefined()
      expect(handlers.onExecuted).toHaveBeenCalled()
    })
  })
})
