import { WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpMultiversxDataLoader } from './WarpMultiversxDataLoader'

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
})
