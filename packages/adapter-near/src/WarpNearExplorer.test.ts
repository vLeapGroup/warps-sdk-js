import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpNearExplorer } from './WarpNearExplorer'
import { NativeTokenNear } from './chains/near'

describe('WarpNearExplorer', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Near,
    displayName: 'NEAR',
    chainId: 'mainnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.mainnet.near.org',
    logoUrl: 'https://example.com/near-logo.png',
    nativeToken: NativeTokenNear,
  }

  let explorer: WarpNearExplorer

  beforeEach(() => {
    explorer = new WarpNearExplorer(mockChainInfo, mockConfig)
  })

  describe('getAccountUrl', () => {
    it('should return account URL', () => {
      const url = explorer.getAccountUrl('test.near')
      expect(url).toContain('test.near')
      expect(url).toContain('accounts')
    })
  })

  describe('getTransactionUrl', () => {
    it('should return transaction URL', () => {
      const url = explorer.getTransactionUrl('test-hash')
      expect(url).toContain('test-hash')
      expect(url).toContain('transactions')
    })
  })

  describe('getBlockUrl', () => {
    it('should return block URL', () => {
      const url = explorer.getBlockUrl('12345')
      expect(url).toContain('12345')
      expect(url).toContain('blocks')
    })
  })

  describe('getContractUrl', () => {
    it('should return contract URL', () => {
      const url = explorer.getContractUrl('contract.near')
      expect(url).toContain('contract.near')
      expect(url).toContain('accounts')
    })
  })
})
