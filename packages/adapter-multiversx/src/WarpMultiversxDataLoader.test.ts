import { WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpMultiversxDataLoader } from './WarpMultiversxDataLoader'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

describe('WarpMultiversxDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'devnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: 'multiversx',
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: 'EGLD',
  }

  let dataLoader: WarpMultiversxDataLoader

  beforeEach(() => {
    dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpMultiversxDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should have getAccount method', () => {
      expect(typeof dataLoader.getAccount).toBe('function')
    })
  })

  describe('getAccountAssets', () => {
    it('should have getAccountAssets method', () => {
      expect(typeof dataLoader.getAccountAssets).toBe('function')
    })
  })

  describe('getAccountActions', () => {
    it('should fetch account actions without pagination', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([
          {
            txHash: 'tx1',
            receiver: 'receiver1',
            sender: 'sender1',
            value: '1000000000000000000',
            function: 'transfer',
            status: 'success',
            timestampMs: 1640995200000,
          },
        ]),
      }

      jest.spyOn(WarpMultiversxExecutor, 'getChainEntrypoint').mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      const result = await dataLoader.getAccountActions('erd1test')

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1test/transactions')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        chain: 'multiversx',
        id: 'tx1',
        receiver: 'receiver1',
        sender: 'sender1',
        value: '1000000000000000000',
        function: 'transfer',
        status: 'success',
        createdAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should fetch account actions with pagination', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([
          {
            txHash: 'tx2',
            receiver: 'receiver2',
            sender: 'sender2',
            value: '2000000000000000000',
            function: 'transfer',
            status: 'success',
            timestampMs: 1640995200000,
          },
        ]),
      }

      jest.spyOn(WarpMultiversxExecutor, 'getChainEntrypoint').mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      const result = await dataLoader.getAccountActions('erd1test', { page: 1, size: 10 })

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1test/transactions?from=10&size=10')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        chain: 'multiversx',
        id: 'tx2',
        receiver: 'receiver2',
        sender: 'sender2',
        value: '2000000000000000000',
        function: 'transfer',
        status: 'success',
        createdAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should use default pagination values when not provided', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([]),
      }

      jest.spyOn(WarpMultiversxExecutor, 'getChainEntrypoint').mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      await dataLoader.getAccountActions('erd1test', {})

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1test/transactions')
    })
  })
})
