import { WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmBuilder } from './WarpEvmBuilder'

jest.mock('ethers')

describe('WarpEvmBuilder', () => {
  let builder: WarpEvmBuilder
  let mockConfig: WarpClientConfig

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
    } as WarpClientConfig

    // Mock ethers functions
    ;(ethers.keccak256 as unknown as jest.Mock).mockImplementation((data: string) => {
      return `0x${data.slice(0, 64)}`
    })
    ;(ethers.toUtf8Bytes as unknown as jest.Mock).mockImplementation((str: string) => {
      return new Uint8Array(Buffer.from(str, 'utf8'))
    })
    ;(ethers.toUtf8String as unknown as jest.Mock).mockImplementation((data: string) => {
      return Buffer.from(data.slice(2), 'hex').toString('utf8')
    })
    ;(ethers.hexlify as unknown as jest.Mock).mockImplementation((data: Uint8Array) => {
      return `0x${Buffer.from(data).toString('hex')}`
    })

    builder = new WarpEvmBuilder(mockConfig)
  })

  describe('createFromRaw', () => {
    it('should create warp from raw JSON string', async () => {
      const warpData = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        description: 'A test warp',
        actions: [],
      }

      const result = await builder.createFromRaw(JSON.stringify(warpData))

      expect(result.protocol).toBe('warp')
      expect(result.name).toBe('test-warp')
      expect(result.title).toBe('Test Warp')
      expect(result.description).toBe('A test warp')
    })

    it('should throw error for invalid JSON', async () => {
      await expect(builder.createFromRaw('invalid json')).rejects.toThrow('Failed to decode warp from raw data')
    })
  })

  describe('build', () => {
    it('should build a complete warp', async () => {
      builder.setTitle('Test Warp')
      builder.setDescription('A test warp')
      builder.setPreview('test-preview')
      builder.addAction({ type: 'transfer', label: 'Transfer' })

      const result = await builder.build()

      expect(result.protocol).toBe('warp')
      expect(result.title).toBe('Test Warp')
      expect(result.description).toBe('A test warp')
      expect(result.preview).toBe('test-preview')
      expect(result.actions).toHaveLength(1)
      expect(result.meta?.chain).toBe('evm')
      expect(result.meta?.creator).toBe(mockConfig.user?.wallets?.evm)
    })

    it('should throw error if title is missing', async () => {
      builder.setDescription('A test warp')

      await expect(builder.build()).rejects.toThrow('Warp title is required')
    })
  })

  describe('createInscriptionTransaction', () => {
    it('should create inscription transaction', () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      } as any

      const result = builder.createInscriptionTransaction(warp)

      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('string')
    })
  })

  describe('createFromTransaction', () => {
    it('should create warp from transaction', async () => {
      const warpData = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      }

      const mockTx = {
        data: `0x${Buffer.from(JSON.stringify(warpData), 'utf8').toString('hex')}`,
      } as any

      const result = await builder.createFromTransaction(mockTx)

      expect(result.protocol).toBe('warp')
      expect(result.name).toBe('test-warp')
      expect(result.title).toBe('Test Warp')
    })

    it('should throw error for transaction without data', async () => {
      const mockTx = { data: '0x' } as any

      await expect(builder.createFromTransaction(mockTx)).rejects.toThrow('Transaction has no data')
    })

    it('should validate warp when validate is true', async () => {
      const invalidWarpData = {
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
      }

      const mockTx = {
        data: `0x${Buffer.from(JSON.stringify(invalidWarpData), 'utf8').toString('hex')}`,
      } as any

      await expect(builder.createFromTransaction(mockTx, true)).rejects.toThrow('Invalid warp protocol')
    })
  })
})
