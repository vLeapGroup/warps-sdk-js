import { Warp, WarpCollectAction, WarpInitConfig } from '@vleap/warps-core'
import * as adapterRegistry from '../config/adapter'
import { WarpExecutor } from './WarpExecutor'

describe('WarpExecutor', () => {
  const config: WarpInitConfig = {
    env: 'devnet',
    user: { wallet: 'erd1...' },
    currentUrl: 'https://example.com',
  }
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

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('executes using Multiversx executor by default', async () => {
    const executor: WarpExecutor = new WarpExecutor(config)
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
    class MockMultiversxExecutor {
      constructor() {}
      async execute() {
        return 'multiversx-result'
      }
    }
    jest.spyOn(adapterRegistry, 'getAdapter').mockImplementation((chain) => {
      if (chain === 'multiversx') return () => MockMultiversxExecutor
      return null
    })
    const result = await executor.execute(warp, 0, [])
    expect(result[0]).toBe('multiversx-result')
    expect(result[1]).toEqual(mockChainInfo)
  })

  it('executes using Sui executor if chain is sui and adapter is present', async () => {
    const executor: WarpExecutor = new WarpExecutor(config)
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
    class MockSuiExecutor {
      constructor() {}
      async execute() {
        return 'sui-result'
      }
    }
    jest.spyOn(adapterRegistry, 'getAdapter').mockImplementation((chain) => {
      if (chain === 'sui') return () => MockSuiExecutor
      if (chain === 'multiversx')
        return () =>
          class {
            async execute() {
              return 'multiversx-result'
            }
          }
      return null
    })
    const result = await executor.execute(warp, 1, [])
    expect(result[0]).toBe('sui-result')
    expect(result[1]).toEqual(mockSuiChainInfo)
  })

  it('throws error if no adapter is registered for chain', async () => {
    const executor: WarpExecutor = new WarpExecutor(config)
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
    jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(null)
    await expect(executor.execute(warp, 1, [])).rejects.toThrow('No adapter registered for chain: unknown')
  })

  it('executeCollect - creates correct input payload structure', async () => {
    config.currentUrl = 'https://example.com?queryParam=testValue'
    const subject = new WarpExecutor(config)
    const httpMock = require('./test-utils/mockHttp').setupHttpMock()

    const action: WarpCollectAction = {
      type: 'collect',
      label: 'test',
      description: 'test',
      destination: {
        url: 'https://example.com/collect',
        method: 'POST',
        headers: {},
      },
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

    const actual = await subject.executeCollect(warp, 1, ['biguint:1000', 'esdt:WARP-123456|0|1000000000000000000|18'])

    httpMock.assertCall('https://example.com/collect', {
      method: 'POST',
      body: {
        amount: '1000',
        token: {}, // TODO: implement handling for custom adapter types
        address: 'erd1...',
        queryParam: 'testValue',
      },
    })

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
