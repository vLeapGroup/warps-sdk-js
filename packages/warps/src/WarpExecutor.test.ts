import { Warp, WarpInitConfig } from '@vleap/warps-core'
import { WarpExecutor } from './WarpExecutor'

describe('WarpExecutor', () => {
  const handlers = { onExecuted: jest.fn() }
  const warp: Warp = {
    protocol: 'warp',
    name: 'test',
    title: '',
    description: '',
    preview: '',
    actions: [
      {
        type: 'transfer',
        label: 'Test',
        chain: 'multiversx',
        address: 'erd1...',
        value: '0',
        inputs: [],
      },
      {
        type: 'transfer',
        label: 'Test Sui',
        chain: 'sui',
        address: '0x...',
        value: '0',
        inputs: [],
      },
    ],
  } as any

  const mockChainInfo = {
    name: 'multiversx',
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6,
    addressHrp: 'erd',
    apiUrl: 'https://api',
    explorerUrl: 'https://explorer',
    nativeToken: 'EGLD',
  }
  const mockSuiChainInfo = {
    name: 'sui',
    displayName: 'Sui',
    chainId: 'sui-mainnet',
    blockTime: 1,
    addressHrp: '0x',
    apiUrl: 'https://sui-api',
    explorerUrl: 'https://sui-explorer',
    nativeToken: 'SUI',
  }

  const mockAdapter = {
    chain: 'mockchain',
    builder: class {
      createInscriptionTransaction = jest.fn()
      createFromTransaction = jest.fn()
      createFromTransactionHash = jest.fn().mockResolvedValue(null)
    },
    executor: class {},
    results: class {
      async getTransactionExecutionResults() {
        return {
          success: true,
          warp: {},
          action: 0,
          user: null,
          txHash: null,
          next: null,
          values: [],
          results: {},
          messages: {},
        }
      }
    },
    serializer: {
      typedToString: jest.fn(),
      typedToNative: jest.fn(),
      nativeToTyped: jest.fn(),
      nativeToType: jest.fn(),
      stringToTyped: jest.fn(),
    },
    registry: class {
      createWarpRegisterTransaction() {
        return {}
      }
      createWarpUnregisterTransaction() {
        return {}
      }
      createWarpUpgradeTransaction() {
        return {}
      }
      createWarpAliasSetTransaction() {
        return {}
      }
      createWarpVerifyTransaction() {
        return {}
      }
      createWarpTransferOwnershipTransaction() {
        return {}
      }
      createBrandRegisterTransaction() {
        return {}
      }
      createWarpBrandingTransaction() {
        return {}
      }
      getInfoByAlias() {
        return Promise.resolve({ registryInfo: null, brand: null })
      }
      getInfoByHash() {
        return Promise.resolve({ registryInfo: null, brand: null })
      }
      getUserWarpRegistryInfos() {
        return Promise.resolve([])
      }
      getUserBrands() {
        return Promise.resolve([])
      }
      getChainInfos() {
        return Promise.resolve([])
      }
      getChainInfo() {
        return Promise.resolve(null)
      }
      setChain() {
        return Promise.resolve({})
      }
      removeChain() {
        return Promise.resolve({})
      }
      fetchBrand() {
        return Promise.resolve(null)
      }
    },
  }

  const minimalWarp = {
    protocol: 'warp',
    name: 'mock',
    title: 'mock',
    description: '',
    actions: [],
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('executes using Multiversx executor by default', async () => {
    const config: WarpInitConfig = {
      env: 'devnet',
      user: { wallet: 'erd1...' },
      currentUrl: 'https://example.com',
      repository: mockAdapter as any,
      adapters: [
        {
          chain: 'multiversx',
          executor: class MockMultiversxExecutor {
            async createTransaction() {
              return 'multiversx-result'
            }
          },
          results: class {
            async getTransactionExecutionResults() {
              return {
                success: true,
                warp: minimalWarp,
                action: 0,
                user: null,
                txHash: null,
                next: null,
                values: [],
                results: {},
                messages: {},
              }
            }
          },
          serializer: mockAdapter.serializer,
          registry: mockAdapter.registry,
          builder: class {
            createInscriptionTransaction = jest.fn()
            createFromTransaction = jest.fn()
            createFromTransactionHash = jest.fn().mockResolvedValue(null)
          },
        },
      ],
    }
    const executor: WarpExecutor = new WarpExecutor(config, handlers)
    ;(executor as any).factory.createExecutable = async () => ({
      chain: mockChainInfo,
      warp,
      action: 0,
      destination: 'erd1...',
      args: [],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    })
    const result = await executor.execute(warp, [])
    expect(result[0]).toBe('multiversx-result')
    expect(result[1]).toEqual(mockChainInfo)
  })

  it('executes using Sui executor if chain is sui and adapter is present', async () => {
    const config: WarpInitConfig = {
      env: 'devnet',
      user: { wallet: 'erd1...' },
      currentUrl: 'https://example.com',
      repository: mockAdapter as any,
      adapters: [
        {
          chain: 'sui',
          executor: class MockSuiExecutor {
            async createTransaction() {
              return 'sui-result'
            }
          },
          results: class {
            async getTransactionExecutionResults() {
              return {
                success: true,
                warp: minimalWarp,
                action: 0,
                user: null,
                txHash: null,
                next: null,
                values: [],
                results: {},
                messages: {},
              }
            }
          },
          serializer: mockAdapter.serializer,
          registry: mockAdapter.registry,
          builder: class {
            createInscriptionTransaction = jest.fn()
            createFromTransaction = jest.fn()
            createFromTransactionHash = jest.fn().mockResolvedValue(null)
          },
        },
        {
          chain: 'multiversx',
          executor: class MockMultiversxExecutor {
            async createTransaction() {
              return 'multiversx-result'
            }
          },
          results: class {
            async getTransactionExecutionResults() {
              return {
                success: true,
                warp: minimalWarp,
                action: 0,
                user: null,
                txHash: null,
                next: null,
                values: [],
                results: {},
                messages: {},
              }
            }
          },
          serializer: mockAdapter.serializer,
          registry: mockAdapter.registry,
          builder: class {
            createInscriptionTransaction = jest.fn()
            createFromTransaction = jest.fn()
            createFromTransactionHash = jest.fn().mockResolvedValue(null)
          },
        },
      ],
    }
    const executor: WarpExecutor = new WarpExecutor(config, handlers)
    ;(executor as any).factory.createExecutable = async () => ({
      chain: mockSuiChainInfo,
      warp,
      action: 1,
      destination: '0x...',
      args: [],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    })
    const result = await executor.execute(warp, [])
    expect(result[0]).toBe('sui-result')
    expect(result[1]).toEqual(mockSuiChainInfo)
  })

  it('throws error if no adapter is registered for chain', async () => {
    const config: WarpInitConfig = {
      env: 'devnet',
      user: { wallet: 'erd1...' },
      currentUrl: 'https://example.com',
      repository: mockAdapter as any,
      adapters: [],
    }
    const executor: WarpExecutor = new WarpExecutor(config, handlers)
    ;(executor as any).factory.createExecutable = async () => ({
      chain: { ...mockSuiChainInfo, name: 'unknown' },
      warp,
      action: 1,
      destination: '0x...',
      args: [],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    })
    await expect(executor.execute(warp, [])).rejects.toThrow('No adapter registered for chain: unknown')
  })

  it('executeCollect - creates correct input payload structure', async () => {
    const config: WarpInitConfig = {
      env: 'devnet',
      user: { wallet: 'erd1...' },
      currentUrl: 'https://example.com?queryParam=testValue',
      repository: mockAdapter as any,
      adapters: [
        {
          chain: 'multiversx',
          executor: class MockMultiversxExecutor {
            async createTransaction() {
              return 'multiversx-result'
            }
          },
          results: class {
            async getTransactionExecutionResults() {
              return {
                success: true,
                warp: minimalWarp,
                action: 0,
                user: null,
                txHash: null,
                next: null,
                values: [],
                results: {},
                messages: {},
              }
            }
          },
          serializer: mockAdapter.serializer,
          registry: mockAdapter.registry,
          builder: class {
            createInscriptionTransaction = jest.fn()
            createFromTransaction = jest.fn()
            createFromTransactionHash = jest.fn().mockResolvedValue(null)
          },
        },
      ],
    }
    const subject = new WarpExecutor(config, handlers)
    const httpMock = require('./test-utils/mockHttp').setupHttpMock()

    const action: any = {
      type: 'collect',
      label: 'test',
      description: 'test',
      destination: {
        url: 'https://example.com/collect',
        method: 'POST',
        headers: {},
      },
      address: 'https://example.com/collect',
      inputs: [
        { name: 'amount', type: 'biguint', source: 'field', position: 'arg:1' },
        { name: 'token', type: 'esdt', source: 'field', position: 'arg:2' },
        { name: 'address', type: 'address', source: 'user:wallet', position: 'arg:3' },
        { name: 'queryParam', type: 'string', source: 'query', position: 'arg:4' },
      ],
    }

    const warp = {
      protocol: 'warp',
      name: 'test',
      title: '',
      description: '',
      preview: '',
      actions: [action],
      results: {
        USERNAME: 'out.data.username',
        ID: 'out.data.id',
        ALL: 'out',
      },
      messages: {
        successRegistration: 'Your registration has the username: {{USERNAME}}',
        successIdentifier: 'Your registration has the id: {{ID}}',
      },
    }

    httpMock.registerResponse('https://example.com/collect', {
      data: {
        username: 'abcdef',
        id: '12',
      },
    })

    await subject.execute(warp, ['biguint:1000', 'esdt:WARP-123456|0|1000000000000000000|18', 'erd1...', 'testValue'])

    httpMock.assertCall('https://example.com/collect', {
      method: 'POST',
      body: {
        amount: '1000',
        token: {}, // TODO: implement handling for custom adapter types
        address: 'erd1...',
        queryParam: 'testValue',
      },
    })

    const actual = handlers.onExecuted.mock.calls[0][0]
    expect(actual.success).toBe(true)
    expect(actual.results).toEqual({
      USERNAME: 'abcdef',
      ID: '12',
      ALL: { username: 'abcdef', id: '12' },
      _DATA: {
        data: {
          username: 'abcdef',
          id: '12',
        },
      },
    })
    expect(actual.messages).toEqual({
      successRegistration: 'Your registration has the username: abcdef',
      successIdentifier: 'Your registration has the id: 12',
    })

    httpMock.cleanup()
  })
})
