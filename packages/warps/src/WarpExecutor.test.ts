import { Warp, WarpInitConfig } from '@vleap/warps-core'
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
      return undefined
    })
    const result = await executor.execute(warp, 0, [])
    expect(result).toBe('multiversx-result')
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
      return undefined
    })
    const result = await executor.execute(warp, 1, [])
    expect(result).toBe('sui-result')
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
    jest.spyOn(adapterRegistry, 'getAdapter').mockReturnValue(undefined)
    await expect(executor.execute(warp, 1, [])).rejects.toThrow('No adapter registered for chain: unknown')
  })
})
