import { WarpClientConfig } from '@vleap/warps'
import { SuiExplorers } from './constants'
import { WarpSuiExplorer } from './WarpSuiExplorer'

describe('WarpSuiExplorer', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet',
    preferences: {
      explorers: {
        sui: 'suivision',
      },
    },
  }

  let explorer: WarpSuiExplorer

  beforeEach(() => {
    explorer = new WarpSuiExplorer(mockConfig, 'sui')
  })

  describe('getAccountUrl', () => {
    it('should return correct account URL with default explorer', () => {
      const address = '0x1234567890abcdef'
      const url = explorer.getAccountUrl(address)
      expect(url).toBe('https://suivision.xyz/account/0x1234567890abcdef')
    })

    it('should return correct account URL with specific explorer', () => {
      const address = '0x1234567890abcdef'
      const url = explorer.getAccountUrl(address, SuiExplorers.SuiScan)
      expect(url).toBe('https://suiscan.xyz/account/0x1234567890abcdef')
    })
  })

  describe('getTransactionUrl', () => {
    it('should return correct transaction URL with default explorer', () => {
      const hash = 'abc123def456'
      const url = explorer.getTransactionUrl(hash)
      expect(url).toBe('https://suivision.xyz/txblock/abc123def456')
    })

    it('should return correct transaction URL with specific explorer', () => {
      const hash = 'abc123def456'
      const url = explorer.getTransactionUrl(hash, SuiExplorers.SuiScanTestnet)
      expect(url).toBe('https://testnet.suiscan.xyz/txblock/abc123def456')
    })
  })

  describe('getBlockUrl', () => {
    it('should return correct block URL with default explorer', () => {
      const blockNumber = '12345'
      const url = explorer.getBlockUrl(blockNumber)
      expect(url).toBe('https://suivision.xyz/block/12345')
    })

    it('should return correct block URL with specific explorer', () => {
      const blockNumber = 12345
      const url = explorer.getBlockUrl(blockNumber, SuiExplorers.SuiVisionDevnet)
      expect(url).toBe('https://devnet.suivision.xyz/block/12345')
    })
  })

  describe('getTokenUrl', () => {
    it('should return correct token URL with default explorer', () => {
      const tokenAddress = '0x1234567890abcdef'
      const url = explorer.getTokenUrl(tokenAddress)
      expect(url).toBe('https://suivision.xyz/token/0x1234567890abcdef')
    })

    it('should return correct token URL with specific explorer', () => {
      const tokenAddress = '0x1234567890abcdef'
      const url = explorer.getTokenUrl(tokenAddress, SuiExplorers.SuiScanTestnet)
      expect(url).toBe('https://testnet.suiscan.xyz/token/0x1234567890abcdef')
    })
  })

  describe('getContractUrl', () => {
    it('should return correct contract URL with default explorer', () => {
      const contractAddress = '0x1234567890abcdef'
      const url = explorer.getContractUrl(contractAddress)
      expect(url).toBe('https://suivision.xyz/object/0x1234567890abcdef')
    })

    it('should return correct contract URL with specific explorer', () => {
      const contractAddress = '0x1234567890abcdef'
      const url = explorer.getContractUrl(contractAddress, SuiExplorers.SuiVisionDevnet)
      expect(url).toBe('https://devnet.suivision.xyz/object/0x1234567890abcdef')
    })
  })

  describe('getAllExplorers', () => {
    it('should return all available explorers for sui chain', () => {
      const explorers = explorer.getAllExplorers()
      expect(explorers).toContain(SuiExplorers.SuiVision)
      expect(explorers).toContain(SuiExplorers.SuiScan)
    })

    it('should return fallback explorer when chain is not supported', () => {
      const unsupportedExplorer = new WarpSuiExplorer(mockConfig, 'unsupported-chain')
      const explorers = unsupportedExplorer.getAllExplorers()
      expect(explorers).toEqual(['suivision'])
    })
  })

  describe('getExplorerByName', () => {
    it('should return explorer by name', () => {
      const explorerName = explorer.getExplorerByName('suivision')
      expect(explorerName).toBe(SuiExplorers.SuiVision)
    })

    it('should return undefined for non-existent explorer', () => {
      const explorerName = explorer.getExplorerByName('non_existent_explorer')
      expect(explorerName).toBeUndefined()
    })
  })

  describe('getAccountUrls', () => {
    it('should return URLs for all explorers', () => {
      const address = '0x1234567890abcdef'
      const urls = explorer.getAccountUrls(address)

      expect(urls[SuiExplorers.SuiVision]).toBe('https://suivision.xyz/account/0x1234567890abcdef')
      expect(urls[SuiExplorers.SuiScan]).toBe('https://suiscan.xyz/account/0x1234567890abcdef')
    })
  })

  describe('getTransactionUrls', () => {
    it('should return URLs for all explorers', () => {
      const hash = 'abc123def456'
      const urls = explorer.getTransactionUrls(hash)

      expect(urls[SuiExplorers.SuiVision]).toBe('https://suivision.xyz/txblock/abc123def456')
      expect(urls[SuiExplorers.SuiScan]).toBe('https://suiscan.xyz/txblock/abc123def456')
    })
  })

  describe('with testnet environment', () => {
    const testnetConfig: WarpClientConfig = {
      env: 'testnet',
      preferences: {
        explorers: {
          sui: 'suiscan_testnet',
        },
      },
    }

    let testnetExplorer: WarpSuiExplorer

    beforeEach(() => {
      testnetExplorer = new WarpSuiExplorer(testnetConfig, 'sui')
    })

    it('should return correct testnet explorer URLs', () => {
      const address = '0x1234567890abcdef'
      const url = testnetExplorer.getAccountUrl(address, SuiExplorers.SuiVisionTestnet)
      expect(url).toBe('https://testnet.suivision.xyz/account/0x1234567890abcdef')
    })

    it('should return all testnet explorers', () => {
      const explorers = testnetExplorer.getAllExplorers()
      expect(explorers).toContain(SuiExplorers.SuiVisionTestnet)
      expect(explorers).toContain(SuiExplorers.SuiScanTestnet)
    })
  })
})
